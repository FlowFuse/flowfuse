const should = require('should')
const setup = require('../../setup')

describe('Library Storage API', function () {
    let app
    let tokens
    let project
    let project2
    let tokens2

    beforeEach(async function () {
        app = await setup()
        project = app.project
        tokens = await project.refreshAuthTokens()
        project2 = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
        await app.team.addProject(project2)
        tokens2 = await project2.refreshAuthTokens()
    })

    afterEach(async function () {
        await app.close()
    })

    describe('/library', function () {
        async function addToLibrary (libraryURL, name, type) {
            return await app.inject({
                method: 'POST',
                url: `${libraryURL}${name}`,
                payload: {
                    type,
                    meta: { metaName: name },
                    body: 'contents'
                },
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
        }

        async function getFromLibrary (libraryURL, name, type) {
            let query = ''
            if (type) {
                query = `?type=${type}`
            }
            return (await app.inject({
                method: 'GET',
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
            const defaultTeamType = await app.db.models.TeamType.findOne()
            const team3 = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: defaultTeamType.id })
            await team3.reload({ include: [{ model: app.db.models.TeamType }] })
            const project3 = await app.db.models.Project.create({ name: 'project3', type: '', url: '' })
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
            const libraryEntryFolderListing = await getFromLibrary(libraryURL, 'test')
            libraryEntryFolderListing.should.have.length(1)
            libraryEntryFolderListing[0].should.equal('foo')

            const libraryEntryListing = await getFromLibrary(libraryURL, 'test/foo')
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

            const libraryEntry = await getFromLibrary(libraryURL, '')
            libraryEntry.should.have.length(2)
            libraryEntry[0].should.have.property('fn', 'bar3')
            libraryEntry[0].should.have.property('metaName', 'bar3')
            libraryEntry[1].should.eql('test')

            const libraryEntry1 = await getFromLibrary(libraryURL, 'test')
            libraryEntry1.should.eql(['foo', 'funcs'])

            const libraryEntry1FlowsOnly = await getFromLibrary(libraryURL, 'test', 'flows')
            libraryEntry1FlowsOnly.should.eql(['foo'])

            const libraryEntry2 = await getFromLibrary(libraryURL, 'test/foo')
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
    })
})
