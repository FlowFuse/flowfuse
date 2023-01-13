const { readFileSync, readdirSync, access, F_OK, statSync } = require('fs')
const { marked } = require('marked')
const htmlLinkExtractor = require('html-link-extractor')
const url = require('url')
const axios = require('axios')
const path = require('path')

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
    'github.com/flowforge/admin',
    'github.com/flowforge/docker-compose',
    'github.com/flowforge/nodered.snap',
    'github.com/flowforge/flowforge-data',
    'github.com/flowforge/ctrlx-node-red-example',
    'github.com/flowforge/CloudProject',
    'github.com/flowforge/content',
    'github.com/flowforge/security',
    'github.com/orgs/flowforge/projects'
]

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
    // remove # anchor links, not sure how to test these at the moment
    // remove email links
    // remove exceptions - links we now are broken
    links = links.filter((link) => {
        const linkData = url.parse(link)
        return linkData.hostname !== 'localhost' && !link.includes('#') && !link.includes('mailto') && !isUrlException(link)
    })

    linkCount += links.length

    console.log(`\n\n\x1b[33m Running Link Tests: ${fileUri}`)

    links.forEach(async (link) => {
        const linkData = url.parse(link)
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
                access(uri, F_OK, (err) => {
                    if (err) {
                        console.error(`${RED} X Invalid Link: ${link}`)
                        errorRecords.internal.push({
                            source: fileUri,
                            target: link,
                            uri,
                            reason: 404
                        })
                        errors += 1
                    } else {
                        console.log(`${GREEN} /   Valid Link: ${link}`)
                    }
                    resolve()
                })
            }))
        } else {
            // external link - let's validate using HTTP request
            promises.push(axios.get(link)
                .then(() => {
                    console.log(`${GREEN} /   Valid Link: ${link}`)
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
                        throw Error(err)
                    }
                })
            )
        }
    })

    return Promise.all(promises).then(() => {
        console.log(`\n${YELLOW}------ REPORT ------`)
        console.log(`${YELLOW} TESTED:` + `${links.length}`.padStart(12))
        console.log(`${GREEN}  VALID:` + `${links.length - errors}`.padStart(12))
        console.log(`${RED} ERRORS:` + `${errors}`.padStart(12))
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
    console.log(`\n\n${RED}------ INTERNAL ERRORS ------${RESET}`)
    console.log(errorRecords.internal)
    console.log(`\n${RED}------ EXTERNAL ERRORS ------${RESET}`)
    console.log(errorRecords.external)
    console.log(`\n${YELLOW}------ FINAL REPORT ------`)
    console.log(`${YELLOW} TESTED:` + `${linkCount}`.padStart(20))
    console.log(`${GREEN}  VALID:` + `${linkCount - errorCount}`.padStart(20))
    console.log(`${RED} ERRORS:` + `${errorCount}`.padStart(20))

    if (errorCount > 1) {
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
