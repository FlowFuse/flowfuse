const { exec } = require('child_process')
const { log, error } = require('console')
const fs = require('fs')
const path = require('path')
const vers = process.env.npm_config_vers
if (!vers) {
    throw new Error('command line arg vars is missing')
}
const p = path.join('var', 'stacks', vers)
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
