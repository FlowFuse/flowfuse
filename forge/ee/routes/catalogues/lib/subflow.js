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

// const testPackage = {
//     "name": "@flowfuse-32E4NEO5pY/subflow-1",
//     "description": "Test SubFlow",
//     "version": "0.0.1",
//     "license": "Apache-2.0",
//     "node-red": {
//         "nodes": {
//             "test-sub-flow-1": "node.js"
//         },
//         "dependencies": [
//             "node-red-node-geofence"
//         ]
//     },
//     "author": "Ben Hardill <ben@flowfuse.com>",
//     "dependencies": {
//         "node-red-node-geofence": "0.3.4"
//     }
// }
// const testSubflow = {"id":"531b29c5efc1994c","type":"subflow","name":"Subflow 1","info":"","category":"","in":[{"x":50,"y":30,"wires":[{"id":"6f3ed0be763cef63"}]}],"out":[{"x":880,"y":60,"wires":[{"id":"a149a22798dbca6e","port":0}]}],"env":[],"meta":{"module":"@flowfuse-test/subflow-1","type":"test-sub-flow-1","version":"0.0.1","author":"Ben Hardill <ben@flowfuse.com>","desc":"Test SubFlow","license":"Apache-2.0"},"color":"#DDAA99","flow":[{"id":"6f3ed0be763cef63","type":"change","z":"531b29c5efc1994c","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":220,"y":80,"wires":[["3f000e75da3bb098"]]},{"id":"3f000e75da3bb098","type":"switch","z":"531b29c5efc1994c","name":"","property":"payload","propertyType":"msg","rules":[{"t":"eq","v":"","vt":"str"}],"checkall":"true","repair":false,"outputs":1,"x":390,"y":80,"wires":[["a149a22798dbca6e","12f68bbab0c3c5c7"]]},{"id":"a149a22798dbca6e","type":"geofence","z":"531b29c5efc1994c","name":"","mode":"circle","inside":"true","rad":0,"points":[],"centre":{"latitude":0,"longitude":0},"floor":"","ceiling":"","worldmap":false,"outputs":1,"x":540,"y":80,"wires":[[]]},{"id":"12f68bbab0c3c5c7","type":"mqtt out","z":"531b29c5efc1994c","name":"","topic":"","qos":"","retain":"","respTopic":"","contentType":"","userProps":"","correl":"","expiry":"","broker":"d60eade64c45d229","x":570,"y":140,"wires":[]},{"id":"d60eade64c45d229","type":"mqtt-broker","z":"531b29c5efc1994c","name":"test","broker":"localhost","port":1883,"clientid":"","autoConnect":true,"usetls":false,"protocolVersion":4,"keepalive":60,"cleansession":true,"autoUnsubscribe":true,"birthTopic":"","birthQos":"0","birthRetain":"false","birthPayload":"","birthMsg":{},"closeTopic":"","closeQos":"0","closeRetain":"false","closePayload":"","closeMsg":{},"willTopic":"","willQos":"0","willRetain":"false","willPayload":"","willMsg":{},"userProps":"","sessionExpiry":""}]}
// const test = buildUpdate(testPackage, testSubflow, 'http://localhost:4873')

// console.log(JSON.stringify(test, null, 2))

// axios.put('http://localhost:4873/@flowfuse-32E4NEO5pY/subflow-1', test, {
//     headers: {
//         'Content-Type': 'application/json'
//     },
//     auth: {
//         username: 'admin',
//         password: 'secret'
//     }
// })
// .then(n => {
//     console.log(n.data)
// })
// .catch(err => {
//     console.log(err)
// })

module.exports = {
    buildModuleTar,
    buildUpdate
}
