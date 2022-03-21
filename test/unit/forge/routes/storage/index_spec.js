const should = require('should')
const got = require('got')
// const FF_UTIL = require('flowforge-test-utils')
const setup = require('../setup')

describe('Storage API', function () {
    const forgeURL = 'http://localhost:3000'
    let app
    let tokens
    let project
    beforeEach(async function () {
        app = await setup()
        project = app.project
        tokens = await project.refreshAuthTokens()
    })

    afterEach(async function () {
        await app.close()
    })

    it('Get Settings', async function () {
        this.timeout(10000)
        const settingsURL = `${forgeURL}/api/v1/projects/${app.project.id}/settings`
        const newSettings = await got(settingsURL, {
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(newSettings).have.property('storageURL')
        should(newSettings).have.property('forgeURL')
    })

    it('Get Flow', async function () {
        this.timeout(10000)
        const flow = await got(`${forgeURL}/storage/${project.id}/flows`, {
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(flow).eqls([])
    })

    it('Save Flow', async function () {
        this.timeout(10000)
        const newFlow = [{ id: '1', type: 'tab', label: 'tab1', disabled: false, info: '' }]
        await got.post(`${forgeURL}/storage/${project.id}/flows`, {
            json: newFlow,
            responseType: 'json',
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        })
        const flow = await got(`${forgeURL}/storage/${project.id}/flows`, {
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(flow).eqls(newFlow)
    })

    it('Get Credentials', async function () {
        this.timeout(10000)
        const creds = await got(`${forgeURL}/storage/${project.id}/credentials`, {
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(creds).eqls({})
    })

    it('Save Credentials', async function () {
        this.timeout(10000)
        const newCreds = [{ id: '1', type: 'tab', label: 'tab1', disabled: false, info: '' }]
        await got.post(`${forgeURL}/storage/${project.id}/credentials`, {
            json: newCreds,
            responseType: 'json',
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        })
        const creds = await got(`${forgeURL}/storage/${project.id}/credentials`, {
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(creds).eqls(newCreds)
    })

    it('Get Settings', async function () {
        this.timeout(10000)
        const settings = await got(`${forgeURL}/storage/${project.id}/settings`, {
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(settings).eqls({})
    })

    it('Save Settings', async function () {
        this.timeout(10000)
        const newSettings = [{ id: '1', type: 'tab', label: 'tab1', disabled: false, info: '' }]
        await got.post(`${forgeURL}/storage/${project.id}/settings`, {
            json: newSettings,
            responseType: 'json',
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        })
        const creds = await got(`${forgeURL}/storage/${project.id}/settings`, {
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(creds).eqls(newSettings)
    })

    it('Get Sessions', async function () {
        this.timeout(10000)
        const sessions = await got(`${forgeURL}/storage/${project.id}/sessions`, {
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(sessions).eqls({})
    })

    it('Save Sessions', async function () {
        this.timeout(10000)
        const newSessions = [{ id: '1', type: 'tab', label: 'tab1', disabled: false, info: '' }]
        await got.post(`${forgeURL}/storage/${project.id}/sessions`, {
            json: newSessions,
            responseType: 'json',
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        })
        const creds = await got(`${forgeURL}/storage/${project.id}/sessions`, {
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(creds).eqls(newSessions)
    })

    it('Add to Library', async function () {
        this.timeout(10000)
        const funcText = '\nreturn msg;'
        await got.post(`${forgeURL}/storage/${project.id}/library/functions`, {
            json: {
                name: 'test',
                meta: {},
                body: funcText
            },
            responseType: 'json',
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        })
        const libraryEntry = await got(`${forgeURL}/storage/${project.id}/library/functions`, {
            searchParams: {
                name: 'test'
            },
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).text()
        should(libraryEntry).equal('\nreturn msg;')
    })

    it('Add to Library with path', async function () {
        this.timeout(10000)
        const funcText = '\nreturn msg;'
        await got.post(`${forgeURL}/storage/${project.id}/library/functions`, {
            json: {
                name: 'test/foo/bar',
                meta: {},
                body: funcText
            },
            responseType: 'json',
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        })
        const libraryEntry = await got(`${forgeURL}/storage/${project.id}/library/functions`, {
            searchParams: {
                name: 'test'
            },
            headers: {
                authorization: `Bearer ${tokens.token}`
            }
        }).json()
        should(libraryEntry).containDeep(['foo'])
    })
})
