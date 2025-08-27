const crypto = require('crypto')
const { gzipSync } = require('zlib')

const tar = require('tar-stream')

const WRAPPER = 'const fs = require("fs")\n' +
                'const path = require("path")\n\n' +
                'module.exports = function(RED) {\n' +
                '   const subflowFile = path.join(__dirname,"subflow.json")\n' +
                '   const subflowContents = fs.readFileSync(subflowFile)\n' +
                '   const subflowJSON = JSON.parse(subflowContents)\n' +
                '   RED.nodes.registerSubflow(subflowJSON)\n' +
                '}'

async function streamToBuffer (readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = []
        readableStream.on('data', data => {
            if (typeof data === 'string') {
                // Convert string to Buffer assuming UTF-8 encoding
                chunks.push(Buffer.from(data, 'utf-8'))
            } else if (data instanceof Buffer) {
                chunks.push(data)
            } else {
                // Convert other data types to JSON and then to a Buffer
                const jsonData = JSON.stringify(data)
                chunks.push(Buffer.from(jsonData, 'utf-8'))
            }
        })
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks))
        })
        readableStream.on('error', reject)
    })
}

async function buildModuleTar (package, subflow) {
    const pack = tar.pack()
    pack.entry({ name: 'package/package.json' }, JSON.stringify(package))
    pack.entry({ name: 'package/node.js' }, WRAPPER)
    pack.entry({ name: 'package/subflow.json' }, JSON.stringify(subflow))
    pack.finalize()
    const t = await streamToBuffer(pack)
    const compressed = gzipSync(t)
    return compressed
}

async function buildUpdate (package, subflow, registry) {
    const tgz = await buildModuleTar(package, subflow)
    const shasum = crypto.createHash('sha1')
    shasum.update(tgz)
    const attachments = {
        content_type: 'application/octet-stream',
        data: tgz.toString('base64'),
        length: tgz.length
    }
    const version = {
        _id: `${package.name}@${package.version}`,
        author: package.author,
        description: package.description,
        license: package.license,
        name: `${package.name}`,
        keywords: package.keywords || [],
        main: 'node.js',
        dist: {
            shasum: shasum.digest('hex'),
            tarball: `${registry}/${package.name}/${package.name}-${package.version}.tgz`
        },
        readme: 'Generated Node From Subflow',
        version: package.version,
        scripts: {
            test: 'echo "Error: no test specified" && exit 1'
        }
    }
    const upload = {
        _attachments: {
        },
        _id: `${package.name}`,
        description: '',
        'dist-tags': {
            latest: `${package.version}`
        },
        name: `${package.name}`,
        readme: 'Generated Node From Subflow',
        versions: {}
    }

    upload._attachments[`${package.name}-${package.version}.tgz`] = attachments
    upload.versions[`${package.version}`] = version

    return upload
}

module.exports = {
    buildModuleTar,
    buildUpdate
}
