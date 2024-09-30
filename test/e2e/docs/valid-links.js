const { readFileSync, readdirSync, statSync, existsSync } = require('fs')

const path = require('path')

const axios = require('axios')
const htmlLinkExtractor = require('html-link-extractor')
const { marked } = require('marked')

marked.setOptions({
    mangle: false // don't escape autolinked email address with HTML character references.
})

const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

const ignoreFolders = [
    '.github'
]

// URLs we expect to be invalid, and that's okay
const exceptions = [
    'forge.example.com',
    'github.com/FlowFuse/admin',
    'github.com/FlowFuse/docker-compose',
    'github.com/FlowFuse/nodered.snap',
    'github.com/FlowFuse/flowforge-data',
    'github.com/FlowFuse/ctrlx-node-red-example',
    'github.com/FlowFuse/CloudProject',
    'github.com/FlowFuse/content',
    'github.com/FlowFuse/security',
    'github.com/orgs/flowforge/projects',
    '/support'
]

const parseUri = function (uri) {
    try {
        return new URL(uri)
    } catch {
        return {
            protocol: null,
            hostname: null
        }
    }
}

const isUrlException = function (link) {
    for (let i = 0; i < exceptions.length; i++) {
        if (link.includes(exceptions[i])) {
            return true
        }
    }
    return false
}

const getAllMdFiles = function (dirPath, arrayOfFiles) {
    const files = readdirSync(dirPath)

    arrayOfFiles = arrayOfFiles || []

    files.forEach(function (file) {
        if (!ignoreFolders.includes(file)) {
            if (statSync(dirPath + '/' + file).isDirectory()) {
                arrayOfFiles = getAllMdFiles(dirPath + '/' + file, arrayOfFiles)
            } else {
                if (file.endsWith('.md')) {
                    arrayOfFiles.push(path.join(dirPath, '/', file))
                }
            }
        }
    })
    return arrayOfFiles
}

let linkCount = 0

// track details of any errors found for nicer reporting at the end
const errorRecords = {
    internal: [],
    external: []
}

/*
 * Given a file path, read it, and check the validity of any links
*/
async function testLinks (fileUri) {
    // ensure it's a markdown file
    if (!fileUri.endsWith('.md')) {
        throw Error(`${fileUri} is not an .md file`)
    }

    const markdown = readFileSync(fileUri, { encoding: 'utf8' })
    const html = marked(markdown)
    let links = htmlLinkExtractor(html)

    let errors = 0
    const promises = []

    // remove localhost links - they're generally just instructional, not live links
    // remove email links
    // remove exceptions - links we now are broken
    links = links.filter((link) => {
        const linkData = parseUri(link)
        return linkData.hostname !== 'localhost' && !link.includes('mailto') && !isUrlException(link) && !link.startsWith('#')
    })

    linkCount += links.length

    console.info(`\n\n\x1b[33m Running Link Tests: ${fileUri}`)

    links.forEach(async (link) => {
        const linkData = parseUri(link)
        if (!linkData.protocol) {
            // internal links - validate via file system
            promises.push(new Promise((resolve, reject) => {
                const localDir = fileUri.substr(0, fileUri.lastIndexOf('/'))
                let uri = ''
                if (link.startsWith('/')) {
                    // absolute path from /src
                    uri = path.join(__dirname, '../../../', link)
                } else {
                    // link defined as relative to fileUri
                    uri = path.join(__dirname, '../../../', localDir, link)
                }
                uri = uri.replace(/#.*/, '')

                const checkUris = []
                if (uri.endsWith('/')) {
                    // For a link of foo/ that could need to be:
                    //   foo/README.md
                    //   foo.md
                    //   foo/index.md
                    checkUris.push(`${uri}README.md`)
                    checkUris.push(`${uri.slice(0, uri.length - 1)}.md`)
                    checkUris.push(`${uri}index.md`)
                } else {
                    checkUris.push(uri)
                }

                const exists = checkUris.find(u => existsSync(u))
                if (!exists) {
                    console.error(`${RED} X Invalid Link: ${link} (looked for ${uri})`)
                    errorRecords.internal.push({
                        source: fileUri,
                        target: link,
                        checkUris,
                        reason: 404
                    })
                    errors += 1
                } else {
                    console.info(`${GREEN} /   Valid Link: ${link}`)
                    console.info(`${GREEN} /            => ${exists}`)
                }
                resolve()
            }))
        } else {
            // external link - let's validate using HTTP request
            promises.push(axios.get(link)
                .then(() => {
                    console.info(`${GREEN} /   Valid Link: ${link}`)
                })
                .catch(err => {
                    if (err.response) {
                        const status = err.response.status
                        if ([404, 410].includes(status)) {
                            console.error(`${RED} X Invalid Link: ${err.response.status} ${link}`)
                            errorRecords.external.push({
                                source: fileUri,
                                target: link,
                                reason: err.response.status
                            })
                            errors += 1
                        }
                    } else {
                        // not an error triggered by the HTTP response
                        console.error(`Error Retrieving: ${link}`)
                        // throw Error(err)
                    }
                })
            )
        }
    })

    return Promise.all(promises).then(() => {
        console.info(`\n${YELLOW}------ REPORT ------`)
        console.info(`${YELLOW} TESTED:` + `${links.length}`.padStart(12))
        console.info(`${GREEN}  VALID:` + `${links.length - errors}`.padStart(12))
        console.info(`${RED} ERRORS:` + `${errors}`.padStart(12))
    })
}

async function parseDirectory (dir) {
    const handbook = getAllMdFiles(dir)

    for (let i = 0; i < handbook.length; i++) {
        const file = handbook[i]
        await testLinks(file)
    }
}

async function runReport (dir) {
    await parseDirectory(dir)
    const errorCount = errorRecords.internal.length + errorRecords.external.length
    console.info(`\n\n${RED}------ INTERNAL ERRORS ------${RESET}`)
    console.info(errorRecords.internal)
    console.info(`\n${RED}------ EXTERNAL ERRORS ------${RESET}`)
    console.info(errorRecords.external)
    console.info(`\n${YELLOW}------ FINAL REPORT ------`)
    console.info(`${YELLOW} TESTED:` + `${linkCount}`.padStart(20))
    console.info(`${GREEN}  VALID:` + `${linkCount - errorCount}`.padStart(20))
    console.info(`${RED} ERRORS:` + `${errorCount}`.padStart(20))

    if (errorCount > 0) {
        // ensure process fails for reporting in GH Action
        process.exitCode = 1
    }
}

// take file directory as argument
if (!process.argv[2]) {
    throw Error('please pass a directory to search through and test, e.g. node valid-links.js /my-dir/')
} else {
    runReport(process.argv[2])
}
