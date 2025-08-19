const crypto = require('crypto')
const { gzipSync } = require('zlib')

const { tar } = require('tinytar')

const WRAPPER = 'const fs = require("fs")\n' +
                'const path = require("path")\n\n' +
                'module.exports = function(RED) {\n' +
                '   const subflowFile = path.join(__dirname,"subflow.json")\n' +
                '   const subflowContents = fs.readFileSync(subflowFile)\n' +
                '   const subflowJSON = JSON.parse(subflowContents)\n' +
                '   RED.nodes.registerSubflow(subflowJSON)\n' +
                '}'

function buildModuleTar (package, subflow) {
    const t = tar([
        {
            name: 'package.json',
            data: JSON.stringify(package),
            mode: 438, // TUREAD | TUWRITE |TGREAD | TGWRITE | TOREAD | TOWRITE
            prefix: 'package'
        },
        {
            name: 'node.js',
            data: WRAPPER,
            mode: 438, // TUREAD | TUWRITE |TGREAD | TGWRITE | TOREAD | TOWRITE
            prefix: 'package'
        },
        {
            name: 'subflow.json',
            data: JSON.stringify(subflow),
            mode: 438, // TUREAD | TUWRITE |TGREAD | TGWRITE | TOREAD | TOWRITE
            prefix: 'package'
        }
    ])
    const compressed = gzipSync(Buffer.from(t))
    return compressed
}

function buildUpdate (package, subflow, registry) {
    const tgz = buildModuleTar(package, subflow)
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
