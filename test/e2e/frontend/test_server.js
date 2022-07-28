#!/usr/bin/env node
'use strict'

// from: https://glebbahmutov.com/blog/restart-server/

const app = require('./environments/standard')

async function makeServer () {
    const flowforge = await app()
    return new Promise((resolve) => {
        const port = 3000
        const server = flowforge.listen(port, function (err, address) {
            console.log(`Environment running at http://localhost:${port}`)

            if (err) {
                console.error(err)
                process.exit(1)
            }

            const close = () => {
                return new Promise(() => {
                    console.log('closing server')
                    server.close(resolve)
                })
            }
            resolve({ server, port, close })
        })
    })
}

module.exports = makeServer
