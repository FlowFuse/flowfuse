#!/usr/bin/env node
const { exec } = require('child_process')
const { log, error } = require('console')
const fs = require('fs')
const path = require('path')

const flowforgeHome = process.env.FLOWFORGE_HOME

let vers = process.env.npm_config_vers
if (!vers) {
    vers = process.argv[process.argv.length - 1]
    if (!vers) {
        throw new Error('command line arg vars is missing')
    }
}

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(vers)) {
    throw new Error('version not valid semantic version')
}

let p = path.join('var', 'stacks', vers)
if (flowforgeHome) {
    p = path.join(flowforgeHome, p)
}
fs.mkdirSync(p, { recursive: true })

log(`installing stack node-red@${vers}`)
const npmCmd = `npm install --prefix ${p} node-red@${vers}`

exec(npmCmd, (err, stdout, stderr) => {
    if (err) {
        error(err)
    } else {
        log(`installed stack node-red@${vers}`)
    }
})
