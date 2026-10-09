const should = require('should')

const setup = require('../../setup')

describe('Library Storage API', function () {
    let app
    let tokens
    let project
    let project2
    let tokens2
    let team1
    let device1
    let device1Tokens
    let team2
    let device2
    let device2Tokens

    let objectCount = 0
    const generateName = (root = 'object') => `${root}-${objectCount++}`

    before(async function () {
        app = await setup()
        project = app.project
        team1 = app.team
        tokens = await project.refreshAuthTokens()
        project2 = await app.db.models.Project.create({ name: generateName('project'), type: '', url: '' })
        await app.team.addProject(project2)
        tokens2 = await project2.refreshAuthTokens()

        // // create 1 device for team1
        device1 = await app.factory.createDevice({ name: 'D1', type: 'T1' }, team1)
        device1.Team = team1
        device1Tokens = await device1.refreshAuthTokens()

        // create a 2nd team and device for team2
        team2 = await app.factory.createTeam({ name: 'BTeam' })
        await team2.addUser(app.adminUser, { through: { role: app.factory.Roles.Roles.Owner } })
        device2 = await app.factory.createDevice({ name: 'D2', type: 'T2' }, team2)
        device2.Team = team2
        device2Tokens = await device2.refreshAuthTokens()
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.StorageSharedLibrary.destroy({ where: {} })
    })

    describe('/library', function () {
        async function addToLibrary (libraryURL, name, type, token, contents) {
            contents = contents || 'contents'
            token = token || tokens.token
            return await app.inject({
                method: 'POST',
                url: `${libraryURL}${name}`,
                payload: {
                    type,
                    meta: { metaName: name },
                    body: contents
                },
                headers: {
                    authorization: `Bearer ${token}`
                }
            })
        }

        async function getFromLibrary (libraryURL, name, type, token) {
            token = token || tokens.token
            let query = ''
            if (type) {
                query = `?type=${type}`
            }
            return await app.inject({
                method: 'GET',
                url: `${libraryURL}${name}${query}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })
        }

        async function deleteFromLibrary (libraryURL, name, type) {
            let query = ''
            if (type) {
                query = `?type=${type}`
            }
            return (await app.inject({
                method: 'DELETE',
                url: `${libraryURL}${name}${query}`,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })).json()
        }

        async function shouldRejectGet (url, token) {
            const response = await app.inject({
                method: 'GET',
                url,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })
            response.statusCode.should.equal(404)
        }
        async function shouldRejectPost (url, token) {
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: { name: 'test', meta: {}, body: 'foo' }
            })
            response.statusCode.should.equal(404)
        }
        async function createExtraTeamAndProject () {
            // Create a new team, add a project to it and return that project's auth tokens
            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const team3 = await app.db.models.Team.create({ name: generateName('team'), TeamTypeId: defaultTeamType.id })
            await team3.reload({ include: [{ model: app.db.models.TeamType }] })
            const project3 = await app.db.models.Project.create({ name: generateName('project'), type: '', url: '' })
            await team3.addProject(project3)
            return await project3.refreshAuthTokens()
        }
        it('GET Rejects invalid token', async function () {
            const invalidToken = await createExtraTeamAndProject()
            return shouldRejectGet(`/storage/library/${app.team.hashid}/foo`, invalidToken.token)
        })
        it('GET Rejects invalid library id', async function () {
            return shouldRejectGet('/storage/library/invalid/foo', tokens.token)
        })
        it('POST Rejects invalid token', async function () {
            const invalidToken = await createExtraTeamAndProject()
            return shouldRejectPost(`/storage/library/${app.team.hashid}/foo`, invalidToken.token)
        })
        it('POST Rejects invalid library id', async function () {
            return shouldRejectPost('/storage/library/invalid/foo', tokens.token)
        })

        it('Add to Library', async function () {
            this.timeout(10000)
            const funcText = '\nreturn msg;'
            const libraryURL = `/storage/library/${app.team.hashid}/test`
            await app.inject({
                method: 'POST',
                url: libraryURL,
                payload: {
                    type: 'functions',
                    meta: {},
                    body: funcText
                },
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const response = await app.inject({
                method: 'GET',
                url: libraryURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const libraryEntry = response.payload
            should(libraryEntry).equal('\nreturn msg;')
        })

        it('Add to Library from Devices', async function () {
            this.timeout(10000)
            const t1func = '\nmsg.payload="team1";return msg;'
            const t2func = '\nmsg.payload="team2";return msg;'
            const team1LibURL = `/storage/library/${team1.hashid}/`
            const team2LibURL = `/storage/library/${team2.hashid}/`

            // add entry to team1's library
            const add1 = await addToLibrary(team1LibURL, 'test', 'functions', device1Tokens.token, t1func)
            add1.statusCode.should.eql(201)
            // add entry to team2's library
            const add2 = await addToLibrary(team2LibURL, 'test', 'functions', device2Tokens.token, t2func)
            add2.statusCode.should.eql(201)

            // read back team 1 entry to verify it was added correctly
            const get1 = await getFromLibrary(team1LibURL, 'test', 'functions', device1Tokens.token)
            get1.statusCode.should.equal(200)
            get1.should.have.property('payload', t1func)
            // read back team 2 entry to verify it was added correctly
            const get2 = await getFromLibrary(team2LibURL, 'test', 'functions', device2Tokens.token)
            get2.statusCode.should.equal(200)
            get2.should.have.property('payload', t2func)
        })

        it('Prevents Library access from Device in different team', async function () {
            this.timeout(10000)
            const t1func = '\nmsg.payload="team1";return msg;'
            const t2func = '\nmsg.payload="team2";return msg;'
            const team1LibURL = `/storage/library/${team1.hashid}/`
            const team2LibURL = `/storage/library/${team2.hashid}/`

            // add entries to team1 & team2 libraries
            await addToLibrary(team1LibURL, 'test', 'functions', device1Tokens.token, t1func)
            await addToLibrary(team2LibURL, 'test', 'functions', device2Tokens.token, t2func)

            // 404 should be returned because while the device token is valid, it is not in the
            // same team.  NOTE: The 404 is generated by the preHandler hook, not the route handler
            const get3 = await getFromLibrary(team1LibURL, 'test', 'functions', device2Tokens.token)
            get3.statusCode.should.equal(404)
            const get4 = await getFromLibrary(team2LibURL, 'test', 'functions', device1Tokens.token)
            get4.statusCode.should.equal(404)
        })

        it('Add to Library with path', async function () {
            const funcText = '\nreturn msg;'
            const libraryURL = `/storage/library/${app.team.hashid}/`
            await app.inject({
                method: 'POST',
                url: `${libraryURL}test/foo/bar`,
                payload: {
                    type: 'functions',
                    meta: { outputs: 123 },
                    body: funcText
                },
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const response1 = await getFromLibrary(libraryURL, 'test')
            const libraryEntryFolderListing = response1.json()
            libraryEntryFolderListing.should.have.length(1)
            libraryEntryFolderListing[0].should.equal('foo')

            const response2 = await getFromLibrary(libraryURL, 'test/foo')
            const libraryEntryListing = response2.json()
            libraryEntryListing.should.have.length(1)
            const entry = libraryEntryListing[0]
            entry.should.have.property('fn', 'bar')
            entry.should.have.property('type', 'functions')
            entry.should.have.property('outputs', 123)
            entry.should.have.property('updatedAt')
            const updatedAt = new Date(entry.updatedAt)
            ;(Math.abs(Date.now() - updatedAt) < 1000).should.be.true()
        })

        it('Add to Library - access from another team project', async function () {
            this.timeout(10000)
            const funcText = '\nreturn msg;'
            const libraryURL = `/storage/library/${app.team.hashid}/test/foo/bar`
            await app.inject({
                method: 'POST',
                url: libraryURL,
                payload: {
                    type: 'functions',
                    name: 'test',
                    meta: {},
                    body: funcText
                },
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })

            // Now verify it exists in the context of Project2's token
            const response = await app.inject({
                method: 'GET',
                url: libraryURL,
                headers: {
                    authorization: `Bearer ${tokens2.token}`
                }
            })
            const libraryEntry = response.payload
            should(libraryEntry).equal('\nreturn msg;')
        })

        it('Add multiple entries to library and filters by type', async function () {
            const libraryURL = `/storage/library/${app.team.hashid}/`
            /*
              Library file structure:
                ├── bar3
                └── test
                    └── foo
                        ├── bar
                        └── bar2
            */

            await addToLibrary(libraryURL, 'test/foo/bar', 'flows')
            await addToLibrary(libraryURL, 'test/foo/bar2', 'flows')
            await addToLibrary(libraryURL, 'bar3', 'flows')
            await addToLibrary(libraryURL, 'test/funcs/bar4', 'functions')

            const libraryEntry = (await getFromLibrary(libraryURL, '')).json()
            libraryEntry.should.have.length(2)
            libraryEntry[0].should.have.property('fn', 'bar3')
            libraryEntry[0].should.have.property('metaName', 'bar3')
            libraryEntry[1].should.eql('test')

            const libraryEntry1 = (await getFromLibrary(libraryURL, 'test')).json()
            libraryEntry1.should.eql(['foo', 'funcs'])

            const libraryEntry1FlowsOnly = (await getFromLibrary(libraryURL, 'test', 'flows')).json()
            libraryEntry1FlowsOnly.should.eql(['foo'])

            const libraryEntry2 = (await getFromLibrary(libraryURL, 'test/foo')).json()
            libraryEntry2.should.have.length(2)
            libraryEntry2[0].should.have.property('fn', 'bar')
            libraryEntry2[0].should.have.property('metaName', 'test/foo/bar')
            libraryEntry2[1].should.have.property('fn', 'bar2')
            libraryEntry2[1].should.have.property('metaName', 'test/foo/bar2')
        })

        it('Prevents creating a entry name/path that clashes with existing path/name', async function () {
            const libraryURL = `/storage/library/${app.team.hashid}/`

            // Create an entry called test/foo
            await addToLibrary(libraryURL, 'test/foo/bar', 'flows')

            // Now try to create an entry that implies test/foo/bar is a directory
            const response = await addToLibrary(libraryURL, 'test/foo/bar/file', 'functions')
            response.statusCode.should.equal(400)

            // Now try to create an entry that clashes with the directory test/foo
            const response2 = await addToLibrary(libraryURL, 'test/foo', 'functions')
            response2.statusCode.should.equal(400)
        })

        it('Deletes an individual entry', async function () {
            const libraryURL = `/storage/library/${app.team.hashid}/`
            /*
              Library file structure:
                ├── bar3 (flows)
                └── test
                    └── foo
                    |   ├── bar (flows)
                    |   └── bar2 (flows)
                    └── funcs
                        └── bar4 (funcs)
            */
            await addToLibrary(libraryURL, 'test/foo/bar', 'flows')
            await addToLibrary(libraryURL, 'test/foo/bar2', 'flows')
            await addToLibrary(libraryURL, 'bar3', 'flows')
            await addToLibrary(libraryURL, 'test/funcs/bar4', 'functions')

            ;(await app.db.models.StorageSharedLibrary.count()).should.equal(4)

            const result = await deleteFromLibrary(libraryURL, 'test/foo/bar')
            result.should.have.property('status', 'okay')
            result.should.have.property('deleteCount', 1)
            ;(await app.db.models.StorageSharedLibrary.count()).should.equal(3)
        })

        it('Deletes a folder - all types', async function () {
            const libraryURL = `/storage/library/${app.team.hashid}/`
            /*
              Library file structure:
                ├── bar3 (flows)
                └── test
                    └── foo
                    |   ├── bar (flows)
                    |   └── bar2 (flows)
                    └── funcs
                        └── bar4 (funcs)
            */
            await addToLibrary(libraryURL, 'test/foo/bar', 'flows')
            await addToLibrary(libraryURL, 'test/foo/bar2', 'flows')
            await addToLibrary(libraryURL, 'bar3', 'flows')
            await addToLibrary(libraryURL, 'test/funcs/bar4', 'functions')

            ;(await app.db.models.StorageSharedLibrary.count()).should.equal(4)

            const result = await deleteFromLibrary(libraryURL, 'test')
            result.should.have.property('status', 'okay')
            result.should.have.property('deleteCount', 3)
            ;(await app.db.models.StorageSharedLibrary.count()).should.equal(1)
        })
        it('Deletes a folder - specific type', async function () {
            const libraryURL = `/storage/library/${app.team.hashid}/`
            /*
              Library file structure:
                ├── bar3 (flows)
                └── test
                    └── foo
                    |   ├── bar (flows)
                    |   └── bar2 (flows)
                    └── funcs
                        └── bar4 (funcs)
            */
            await addToLibrary(libraryURL, 'test/foo/bar', 'flows')
            await addToLibrary(libraryURL, 'test/foo/bar2', 'flows')
            await addToLibrary(libraryURL, 'bar3', 'flows')
            await addToLibrary(libraryURL, 'test/funcs/bar4', 'functions')

            ;(await app.db.models.StorageSharedLibrary.count()).should.equal(4)

            const result = await deleteFromLibrary(libraryURL, 'test', 'flows')
            result.should.have.property('status', 'okay')
            result.should.have.property('deleteCount', 2)
            ;(await app.db.models.StorageSharedLibrary.count()).should.equal(2)
        })

        it('Delete returns 404 if path not matched', async function () {
            const libraryURL = `/storage/library/${app.team.hashid}/`
            /*
              Library file structure:
                ├── bar3 (flows)
                └── test
                    └── foo
                    |   ├── bar (flows)
                    |   └── bar2 (flows)
                    └── funcs
                        └── bar4 (funcs)
            */
            await addToLibrary(libraryURL, 'test/foo/bar', 'flows')
            await addToLibrary(libraryURL, 'test/foo/bar2', 'flows')
            await addToLibrary(libraryURL, 'bar3', 'flows')
            await addToLibrary(libraryURL, 'test/funcs/bar4', 'functions')

            ;(await app.db.models.StorageSharedLibrary.count()).should.equal(4)

            const result = await deleteFromLibrary(libraryURL, 'test/fo')
            result.should.have.property('code', 'not_found')
            ;(await app.db.models.StorageSharedLibrary.count()).should.equal(4)
        })

        describe('audit log', function () {
            const libraryURL = () => `/storage/library/${app.team.hashid}/`

            async function auditEntries (event) {
                const logs = await app.db.models.AuditLog.findAll({ where: { event } })
                return logs.map(log => JSON.parse(log.body))
            }

            beforeEach(async function () {
                await app.db.models.AuditLog.destroy({ where: {} })
            })

            it('logs the creation of an entry', async function () {
                await addToLibrary(libraryURL(), 'audit/new', 'flows')
                const entries = await auditEntries('team.library.entry.created')
                entries.should.have.length(1)
                entries[0].libraryEntry.should.only.have.keys('name', 'type')
                entries[0].libraryEntry.should.have.property('name', 'audit/new')
                entries[0].libraryEntry.should.have.property('type', 'flows')
                const updated = await auditEntries('team.library.entry.updated')
                updated.should.have.length(0)
            })

            it('logs the overwrite of an entry as an update, not a creation', async function () {
                await addToLibrary(libraryURL(), 'audit/over', 'flows')
                await app.db.models.AuditLog.destroy({ where: {} })
                await addToLibrary(libraryURL(), 'audit/over', 'flows', null, 'changed')
                const updated = await auditEntries('team.library.entry.updated')
                updated.should.have.length(1)
                updated[0].libraryEntry.should.have.property('name', 'audit/over')
                const created = await auditEntries('team.library.entry.created')
                created.should.have.length(0)
            })

            it('does not log a rejected entry', async function () {
                await addToLibrary(libraryURL(), 'audit/file', 'flows')
                await app.db.models.AuditLog.destroy({ where: {} })
                const response = await addToLibrary(libraryURL(), 'audit/file/child', 'flows')
                response.statusCode.should.equal(400)
                const entries = await auditEntries('team.library.entry.created')
                entries.should.have.length(0)
            })

            it('logs the deletion of an entry', async function () {
                await addToLibrary(libraryURL(), 'audit/single', 'flows')
                await deleteFromLibrary(libraryURL(), 'audit/single', 'flows')
                const entries = await auditEntries('team.library.entry.deleted')
                entries.should.have.length(1)
                entries[0].libraryEntry.should.have.property('name', 'audit/single')
                entries[0].libraryEntry.should.have.property('deleteCount', 1)
            })

            it('logs the path and count when a folder is deleted', async function () {
                await addToLibrary(libraryURL(), 'audit/folder/a', 'flows')
                await addToLibrary(libraryURL(), 'audit/folder/b', 'flows')
                await addToLibrary(libraryURL(), 'audit/folder/sub/c', 'flows')
                await deleteFromLibrary(libraryURL(), 'audit/folder')
                const entries = await auditEntries('team.library.entry.deleted')
                entries.should.have.length(1)
                entries[0].libraryEntry.should.have.property('name', 'audit/folder/')
                entries[0].libraryEntry.should.have.property('deleteCount', 3)
            })

            it('does not log a deletion that matches nothing', async function () {
                await deleteFromLibrary(libraryURL(), 'audit/missing')
                const entries = await auditEntries('team.library.entry.deleted')
                entries.should.have.length(0)
            })
        })

        describe('with user tokens', function () {
            let ownerPAT
            let readOnlyPAT
            let viewerPAT
            let outsiderPAT
            let expertToken

            before(async function () {
                const owner = await app.factory.createUser({ username: 'libowner', name: 'Lib Owner', email: 'libowner@example.com', password: 'ooPassword' })
                await team1.addUser(owner, { through: { role: app.factory.Roles.Roles.Owner } })
                const viewer = await app.factory.createUser({ username: 'libviewer', name: 'Lib Viewer', email: 'libviewer@example.com', password: 'vvPassword' })
                await team1.addUser(viewer, { through: { role: app.factory.Roles.Roles.Viewer } })
                const outsider = await app.factory.createUser({ username: 'liboutsider', name: 'Lib Outsider', email: 'liboutsider@example.com', password: 'ooPassword' })

                ownerPAT = (await app.db.controllers.AccessToken.createPersonalAccessToken(owner, '', null, 'owner-pat')).token
                readOnlyPAT = (await app.db.controllers.AccessToken.createPersonalAccessToken(owner, '', null, 'owner-read-only-pat', { readOnly: true })).token
                viewerPAT = (await app.db.controllers.AccessToken.createPersonalAccessToken(viewer, '', null, 'viewer-pat')).token
                outsiderPAT = (await app.db.controllers.AccessToken.createPersonalAccessToken(outsider, '', null, 'outsider-pat')).token
                expertToken = (await app.db.controllers.AccessToken.createTokenForUser(owner, null, [], false, 'user:expert-mcp')).token
            })

            function request (method, path, token, payload) {
                return app.inject({
                    method,
                    url: `/storage/library/${team1.hashid}/${path}`,
                    payload,
                    headers: { authorization: `Bearer ${token}` }
                })
            }

            it('lets a team owner create, read and delete entries with a personal access token', async function () {
                const created = await request('POST', 'pat/entry', ownerPAT, { type: 'functions', meta: {}, body: 'return msg' })
                created.statusCode.should.equal(201)

                const read = await request('GET', 'pat/entry', ownerPAT)
                read.statusCode.should.equal(200)
                read.payload.should.equal('return msg')

                const deleted = await request('DELETE', 'pat/entry', ownerPAT)
                deleted.statusCode.should.equal(200)
                deleted.json().should.have.property('deleteCount', 1)
            })

            it('accepts a user:expert-mcp token', async function () {
                const created = await request('POST', 'expert/entry', expertToken, { type: 'functions', meta: {}, body: 'x' })
                created.statusCode.should.equal(201)
            })

            it('applies the role and read-only checks to user tokens', async function () {
                await request('POST', 'existing', ownerPAT, { type: 'functions', meta: {}, body: 'x' })

                ;(await request('GET', 'existing', readOnlyPAT)).statusCode.should.equal(200)
                ;(await request('GET', 'existing', viewerPAT)).statusCode.should.equal(403)
                ;(await request('POST', 'viewer/entry', viewerPAT, { type: 'functions', meta: {}, body: 'x' })).statusCode.should.equal(403)
                ;(await request('DELETE', 'existing', viewerPAT)).statusCode.should.equal(403)
                ;(await request('POST', 'ro/entry', readOnlyPAT, { type: 'functions', meta: {}, body: 'x' })).statusCode.should.equal(403)
                ;(await request('DELETE', 'existing', readOnlyPAT)).statusCode.should.equal(403)
                ;(await app.db.models.StorageSharedLibrary.count()).should.equal(1)
            })

            it('returns 404 to a user who is not a member of the team', async function () {
                ;(await request('GET', 'anything', outsiderPAT)).statusCode.should.equal(404)
                ;(await request('POST', 'outsider/entry', outsiderPAT, { type: 'functions', meta: {}, body: 'x' })).statusCode.should.equal(404)
            })
        })

        it('Prevents Library access for team type with feature disabled', async function () {
            // Create a teamType without shared-library access
            const teamType = await app.factory.createTeamType({
                name: 'no-shared-library-type',
                properties: {
                    features: { 'shared-library': false }
                }
            })
            const team = await app.factory.createTeam({ name: 'team3', TeamTypeId: teamType.id })

            const project = await app.db.models.Project.create({ name: generateName('project'), type: '', url: '' })
            await team.addProject(project)
            const tokens = await project.refreshAuthTokens()
            await shouldRejectGet(`/storage/library/${team.hashid}/`, tokens.token)
            await shouldRejectPost(`/storage/library/${team.hashid}/foo`, tokens.token)
        })
    })
})
