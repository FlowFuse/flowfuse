#!/usr/bin/env node
'use strict'

const app = require('./environments/standard')

;(async function () {
    const flowforge = await app()
    flowforge.listen(3001, function (err, address) {
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()
