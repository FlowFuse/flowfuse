const FormData = require('form-data') // eslint-disable-line
const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('Static Files APIs', function () {
    let app
    const TestObjects = { tokens: {} }

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    before(async function () {
        app = await setup({
            billing: undefined
        })

        TestObjects.team = app.team
        TestObjects.application = app.application
        TestObjects.instance = app.instance

        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')

        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        const defaultTeamTypeProperties = defaultTeamType.properties

        if (defaultTeamTypeProperties.features) {
            defaultTeamTypeProperties.features.staticAssets = true
        } else {
            defaultTeamTypeProperties.features = {
                staticAssets: true
            }
        }
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()

        const instance2 = await app.factory.createInstance(
            { name: 'project2' },
            app.application,
            app.stack,
            app.template,
            app.projectType,
            { start: false }
        )

        TestObjects.instance2 = instance2

        await app.containers.start(TestObjects.instance)
    })

    after(async function () {
        await app.close()
    })

    it('list files', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(200)
        const body = response.json()
        body.should.have.property('files')
        body.should.have.property('meta')
        body.should.have.property('count')
    })
    it('list files for non existent directory', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo/bar/test')}`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(404)
    })
    it('none member can not list files', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/`,
            cookies: {
                sid: TestObjects.tokens.bob
            }
        })
        response.statusCode.should.equal(404)
    })
    it('create directory', async function () {
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/`,
            body: { path: 'foo/bar' },
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(200)
        const files = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo')}`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        files.statusCode.should.equal(200)
        const fileList = files.json()
        fileList.should.have.property('files')
        fileList.should.have.property('count', 1)
        fileList.files[0].should.have.property('name', 'bar')
        fileList.files[0].should.have.property('type', 'directory')
    })
    it('create directory with no path', async function () {
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/`,
            body: { },
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(400)
    })
    it('create file', async function () {
        const form = new FormData()
        form.append('file', 'helloWorld', { filename: 'helloWorld.txt', contentType: 'text/plain' })
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo/helloWorld.txt/')}`,
            body: form,
            headers: form.getHeaders(),
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(200)
        const files = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo')}`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        files.statusCode.should.equal(200)
        const fileList = files.json()
        fileList.should.have.property('files')
        fileList.should.have.property('count', 2)
        fileList.files[1].should.have.property('type', 'file')
        fileList.files[1].should.have.property('name', 'helloWorld.txt')
        fileList.files[1].should.have.property('size', 10)
    })
    it('create file outside supported the path', async function () {
        const form = new FormData()
        form.append('file', 'helloWorld2', { filename: 'helloWorld2.txt', contentType: 'text/plain' })
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo/../../helloWorld.txt')}`,
            body: form,
            headers: form.getHeaders(),
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(404)
    })
    it('share directory', async function () {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo/bar/')}`,
            body: { share: { root: '/bar' } },
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(200)
        const files = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo')}`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        files.statusCode.should.equal(200)
        const fileList = files.json()
        fileList.should.have.property('files')
        fileList.should.have.property('count', 2)
        fileList.files[0].should.have.property('type', 'directory')
        fileList.files[0].should.have.property('share')
        fileList.files[0].share.should.have.property('root', '/bar')
    })
    it('check directory shared', async function () {
        const token = await TestObjects.instance.refreshAuthTokens()
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/settings`,
            headers: {
                authorization: `Bearer ${token.token}`
            }
        })
        response.statusCode.should.equal(200)
        const body = response.json()
        body.settings.should.have.property('httpStatic')
        body.settings.httpStatic[0].should.have.property('path', 'foo/bar')
        body.settings.httpStatic[0].should.have.property('root', '/bar')
    })
    it('delete file', async function () {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo/helloWorld.txt/')}`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(200)
        const files = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo')}`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        files.statusCode.should.equal(200)
        const fileList = files.json()
        fileList.should.have.property('files')
        fileList.should.have.property('count', 1)
        fileList.files[0].should.have.property('type', 'directory')
        fileList.files[0].should.have.property('name', 'bar')
    })
    it('get non-existent dir', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('baz')}`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(404)
    })
    it('list files on suspended Instance', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance2.id}/files/_/`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(400)
    })
    it('create directory on suspended Instance', async function () {
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${TestObjects.instance2.id}/files/_/`,
            body: { path: 'foo/bar' },
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(400)
    })
    it('share directory on suspended Instance', async function () {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.instance2.id}/files/_/${encodeURIComponent('foo/bar/')}`,
            body: { share: { root: '/bar' } },
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(404)
    })
    it('share and rename directory', async function () {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.instance2.id}/files/_/${encodeURIComponent('foo/bar/')}`,
            body: { share: { root: '/bar' }, path: '/foo/baz' },
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(400)
    })
    it('rename directory', async function () {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.instance2.id}/files/_/${encodeURIComponent('foo/bar/')}`,
            body: { path: '/foo/baz' },
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(400)
    })
    it('create directory on non existent path', async function () {
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${TestObjects.instance2.id}/files/_/${encodeURIComponent('empty/')}`,
            body: { path: 'foo/bar' },
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(400)
    })
    it('list files for none existent instance', async function () {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/projects/foobar/files/_/',
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(404)
    })
    it('delete file from suspended instance', async function () {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.instance2.id}/files/_/${encodeURIComponent('foo/helloWorld.txt/')}`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(400)
    })
    it('delete file from non existent directory', async function () {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.instance.id}/files/_/${encodeURIComponent('foo/bar/baz/test/helloWorld.txt')}`,
            cookies: {
                sid: TestObjects.tokens.alice
            }
        })
        response.statusCode.should.equal(404)
    })
})
