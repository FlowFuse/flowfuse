/* eslint-disable n/no-process-exit */
'use strict'

const TestModelFactory = require('../../lib/TestModelFactory')

const app = require('./environments/standard')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

;(async function () {
    const PORT = 3002

    const flowforge = await app({
        trialMode: true
    }, {
        license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg',
        host: 'localhost',
        port: PORT,
        billing: {
            stripe: {
                key: 1234,
                team_product: 'defaultteamprod',
                team_price: 'defaultteamprice',
                new_customer_free_credit: 1000,
                teams: {
                    starter: {
                        product: 'starterteamprod',
                        price: 'starterteampprice'
                    }
                }
            }
        }
    })

    const factory = new TestModelFactory(flowforge)

    // setup team
    const trialTeam = await factory.createTeam({ name: 'TTeam' })
    // create trial subscription for the team
    await factory.createTrialSubscription(trialTeam, 5)

    // setup user
    const userTerry = await factory.createUser({ username: 'terry', name: 'Terry Organa', email: 'terry@example.com', password: 'ttPassword', email_verified: true, password_expired: false })

    await trialTeam.addUser(userTerry, { through: { role: Roles.Owner } })
    // assign user to the trial team

    flowforge.listen(PORT, function (err, address) {
        console.info(`EE Environment running at http://localhost:${PORT}`)
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()
