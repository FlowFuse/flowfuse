/* eslint-disable n/no-process-exit */
'use strict'

const app = require('./environments/standard')

;(async function () {
    const PORT = 3001

    const flowforge = await app({}, {
        host: 'localhost',
        port: PORT
    })

    flowforge.listen({ port: PORT }, function (err, address) {
        console.info(`OS Environment running at http://localhost:${PORT}`)
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()
