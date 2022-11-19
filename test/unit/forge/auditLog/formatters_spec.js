const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const Formatters = FF_UTIL.require('forge/auditLog/formatters')

describe('Audit Log > Formatters', async function () {
    it('Generated an Audit Log Entry with the correct format', async function () {
        // can get away with passing empty objects here
        // as we test format for each object in following tests
        const entry = Formatters.formatLogEntry({
            hashid: '<hashid>',
            UserId: {},
            User: {},
            event: '<event>',
            createdAt: '<datetime>',
            entityId: '<entityId>',
            entityType: '<entityType>',
            body: {}
        })

        should(entry).have.property('hashid', '<hashid>')
        should(entry).have.property('User')
        should(entry.User).be.an.Object()
        should(entry).have.property('event', '<event>')
        should(entry).have.property('createdAt', '<datetime>')
        should(entry).have.property('scope')
        should(entry.scope).have.property('id', '<entityId>')
        should(entry.scope).have.property('type', '<entityType>')
        should(entry).have.property('trigger')
        should(entry.trigger).be.an.Object()
        should(entry).have.property('body')
        should(entry.body).be.an.Object()
    })

    it('Generated an Audit Log body with the correct format', async function () {
        // can get away with passing empty objects here
        // as we test format for each object in following tests
        const bodyError = Formatters.generateBody({
            error: { code: '<code>', error: '<message>' }
        })
        should(bodyError).have.property('error')

        const body = Formatters.generateBody({
            team: {},
            project: {},
            device: {},
            user: {},
            stack: {},
            billingSession: {},
            license: {},
            snapshot: {},
            projectType: {},
            role: {},
            updates: [{}]
        })
        should(body).have.property('team')
        should(body).have.property('project')
        should(body).have.property('device')
        should(body).have.property('user')
        should(body).have.property('stack')
        should(body).have.property('billingSession')
        should(body).have.property('license')
        should(body).have.property('snapshot')
        should(body).have.property('role')
        should(body).have.property('projectType')
        should(body).have.property('updates')
    })

    it('Generated an UpdatesCollection with push', async function () {
        const updates = new Formatters.UpdatesCollection()
        should(updates.length).be.equal(0)
        updates.push('key1', 1, 2, 'updated')
        updates.push('key2', 2, undefined, 'deleted')
        updates.push('key3', undefined, 3, 'created')
        updates.push('key4[3]', 4, undefined, 'deleted')
        should(updates.length).be.equal(4)

        const body = Formatters.generateBody({
            updates
        })
        should(body).have.property('updates')
        body.updates.find(e => e.key === 'key1').should.deepEqual({ key: 'key1', old: 1, new: 2, dif: 'updated' })
        body.updates.find(e => e.key === 'key2').should.deepEqual({ key: 'key2', old: 2, new: undefined, dif: 'deleted' })
        body.updates.find(e => e.key === 'key3').should.deepEqual({ key: 'key3', old: undefined, new: 3, dif: 'created' })
        body.updates.find(e => e.key === 'key4[3]').should.deepEqual({ key: 'key4[3]', old: 4, new: undefined, dif: 'deleted' })
    })

    it('Generated an UpdatesCollection with pushDifferences', async function () {
        const updates = new Formatters.UpdatesCollection()
        should(updates.length).be.equal(0)
        updates.pushDifferences(
            { key1: 1, key2: 2, key4: [1, 2, 3, 4], key5: 'no change' }, // old settings
            { key1: 2, key3: 3, key4: [1, 2, 3], key5: 'no change' } // new settings
        )
        should(updates.length).be.equal(4)

        const body = Formatters.generateBody({
            updates
        })
        should(body).have.property('updates')
        body.updates.find(e => e.key === 'key1').should.deepEqual({ key: 'key1', old: 1, new: 2, dif: 'updated' })
        body.updates.find(e => e.key === 'key2').should.deepEqual({ key: 'key2', old: 2, new: undefined, dif: 'deleted' })
        body.updates.find(e => e.key === 'key3').should.deepEqual({ key: 'key3', old: undefined, new: 3, dif: 'created' })
        body.updates.find(e => e.key === 'key4[3]').should.deepEqual({ key: 'key4[3]', old: 4, new: undefined, dif: 'deleted' })
    })
    })

    it('Generated an errorObject with the correct format', async function () {
        should(Formatters.errorObject()).be.null()
        const errorA = Formatters.errorObject({ code: '<code>', error: '<message>' })

        should(errorA).be.an.Object()
        should(errorA).have.property('code', '<code>')
        should(errorA).have.property('message', '<message>')

        const errorB = Formatters.errorObject({ code: '<code>', message: '<message>' })

        should(errorB).be.an.Object()
        should(errorB).have.property('code', '<code>')
        should(errorB).have.property('message', '<message>')

        const errorC = Formatters.errorObject({ code: '<code>' })

        should(errorC).be.an.Object()
        should(errorC).have.property('code', '<code>')
        should(errorC).have.property('message', 'unexpected error')

        const errorD = Formatters.errorObject({ message: '<message>' })

        should(errorD).be.an.Object()
        should(errorD).have.property('code', 'unexpected_error')
        should(errorD).have.property('message', '<message>')
    })

    it('Generated a teamObject with the correct format', async function () {
        const teamEmpty = Formatters.teamObject()
        should(teamEmpty).be.an.Object()
        should(teamEmpty).have.property('id', null)
        should(teamEmpty).have.property('hashid', null)
        should(teamEmpty).have.property('name', null)
        should(teamEmpty).have.property('slug', null)
        should(teamEmpty).have.property('type', null)

        const team = Formatters.teamObject({
            id: '<id>',
            hashid: '<hashid>',
            name: '<name>',
            slug: '<slug>',
            type: '<type>'
        })

        should(team).be.an.Object()
        should(team).have.property('id', '<id>')
        should(team).have.property('hashid', '<hashid>')
        should(team).have.property('name', '<name>')
        should(team).have.property('slug', '<slug>')
        should(team).have.property('type', '<type>')
    })

    it('Generated a userObject with the correct format', async function () {
        const userEmpty = Formatters.userObject()
        should(userEmpty).be.an.Object()
        should(userEmpty).have.property('id', null)
        should(userEmpty).have.property('hashid', null)
        should(userEmpty).have.property('name', null)
        should(userEmpty).have.property('username', null)
        should(userEmpty).have.property('email', null)

        const user = Formatters.userObject({
            id: '<id>',
            hashid: '<hashid>',
            name: '<name>',
            username: '<username>',
            email: '<email>'
        })

        should(user).be.an.Object()
        should(user).have.property('id', '<id>')
        should(user).have.property('hashid', '<hashid>')
        should(user).have.property('name', '<name>')
        should(user).have.property('username', '<username>')
        should(user).have.property('email', '<email>')
    })

    it('Generated a projectObject with the correct format', async function () {
        const projectEmpty = Formatters.projectObject()
        should(projectEmpty).be.an.Object()
        should(projectEmpty).have.property('id', null)
        should(projectEmpty).have.property('hashid', null)
        should(projectEmpty).have.property('name', null)

        const project = Formatters.projectObject({
            id: '<id>',
            hashid: '<hashid>',
            name: '<name>'
        })

        should(project).be.an.Object()
        should(project).have.property('id', '<id>')
        should(project).have.property('hashid', '<hashid>')
        should(project).have.property('name', '<name>')
    })

    it('Generated a deviceObject with the correct format', async function () {
        const deviceEmpty = Formatters.deviceObject()
        should(deviceEmpty).be.an.Object()
        should(deviceEmpty).have.property('id', null)
        should(deviceEmpty).have.property('hashid', null)
        should(deviceEmpty).have.property('name', null)

        const device = Formatters.deviceObject({
            id: '<id>',
            hashid: '<hashid>',
            name: '<name>'
        })

        should(device).be.an.Object()
        should(device).have.property('id', '<id>')
        should(device).have.property('hashid', '<hashid>')
        should(device).have.property('name', '<name>')
    })

    it('Generated a stackObject with the correct format', async function () {
        const stackEmpty = Formatters.stackObject()
        should(stackEmpty).be.an.Object()
        should(stackEmpty).have.property('id', null)
        should(stackEmpty).have.property('hashid', null)
        should(stackEmpty).have.property('name', null)

        const stack = Formatters.stackObject({
            id: '<id>',
            hashid: '<hashid>',
            name: '<name>'
        })

        should(stack).be.an.Object()
        should(stack).have.property('id', '<id>')
        should(stack).have.property('hashid', '<hashid>')
        should(stack).have.property('name', '<name>')
    })

    it('Generated a billingSessionObject with the correct format', async function () {
        const billingSessionEmpty = Formatters.billingSessionObject()
        should(billingSessionEmpty).be.an.Object()
        should(billingSessionEmpty).have.property('id', null)

        const billingSession = Formatters.billingSessionObject({
            id: '<id>'
        })

        should(billingSession).be.an.Object()
        should(billingSession).have.property('id', '<id>')
    })

    it('Generated a licenseObject with the correct format', async function () {
        const licenseEmpty = Formatters.licenseObject()
        should(licenseEmpty).be.an.Object()
        should(licenseEmpty).have.property('id', null)

        const license = Formatters.licenseObject({
            id: '<id>'
        })

        should(license).be.an.Object()
        should(license).have.property('id', '<id>')
    })

    it('Generated a snapshotObject with the correct format', async function () {
        const snapshotEmpty = Formatters.snapshotObject()
        should(snapshotEmpty).be.an.Object()
        should(snapshotEmpty).have.property('id', null)
        should(snapshotEmpty).have.property('hashid', null)
        should(snapshotEmpty).have.property('name', null)

        const snapshot = Formatters.snapshotObject({
            id: '<id>',
            hashid: '<hashid>',
            name: '<name>'
        })

        should(snapshot).be.an.Object()
        should(snapshot).have.property('id', '<id>')
        should(snapshot).have.property('hashid', '<hashid>')
        should(snapshot).have.property('name', '<name>')
    })

    it('Generated a roleObject with the correct format', async function () {
        const roleEmpty = Formatters.roleObject()
        should(roleEmpty).be.undefined()

        const role = Formatters.roleObject({
            role: 'member'
        })

        should(role).be.an.Object()
        should(role).have.property('role', 'member')

        const roleNumMember = Formatters.roleObject(30)

        should(roleNumMember).be.an.Object()
        should(roleNumMember).have.property('role', 'member')

        const roleNumUnknown = Formatters.roleObject(300)

        should(roleNumUnknown).be.an.Object()
        should(roleNumUnknown).have.property('role', 'Unknown Role: 300')
    })

    it('Generated a triggerObject with the correct format', async function () {
        const triggerEmpty = Formatters.triggerObject()
        should(triggerEmpty).have.property('id', null)
        should(triggerEmpty).have.property('hashid', null)
        should(triggerEmpty).have.property('type', 'unknown')
        should(triggerEmpty).have.property('name', 'Unknown')

        const triggerPlatform = Formatters.triggerObject(0)

        should(triggerPlatform).be.an.Object()
        should(triggerPlatform).have.property('id', 0)
        should(triggerPlatform).have.property('hashid', null)
        should(triggerPlatform).have.property('type', 'system')
        should(triggerPlatform).have.property('name', 'Forge Platform')

        const triggerUserHash = Formatters.triggerObject('<hash>', {
            email: '<email>'
        })

        should(triggerUserHash).be.an.Object()
        should(triggerUserHash).have.property('id', '<hash>')
        should(triggerUserHash).have.property('hashid', '<hash>')
        should(triggerUserHash).have.property('type', 'user')
        should(triggerUserHash).have.property('name', '<email>')

        const triggerUser = Formatters.triggerObject(1, {
            username: '<username>'
        })

        should(triggerUser).be.an.Object()
        should(triggerUser).have.property('id', 1)
        should(triggerUser).have.property('hashid', null)
        should(triggerUser).have.property('type', 'user')
        should(triggerUser).have.property('name', '<username>')
    })

    it('Generates an update object with the correct format', async function () {
        const updated = Formatters.updatesObject('key', 0, 1)
        should(updated).have.property('key', 'key')
        should(updated).have.property('old', 0)
        should(updated).have.property('new', 1)
        should(updated).have.property('dif', 'updated')

        const deleted = Formatters.updatesObject('key', 0, undefined, 'deleted')
        should(deleted).have.property('key', 'key')
        should(deleted).have.property('old', 0)
        should(deleted).have.property('new', undefined)
        should(deleted).have.property('dif', 'deleted')

        const created = Formatters.updatesObject('key', undefined, 1, 'created')
        should(created).have.property('key', 'key')
        should(created).have.property('old', undefined)
        should(created).have.property('new', 1)
        should(created).have.property('dif', 'created')

        should(() => {
            Formatters.updatesObject('key', undefined, 1, 'something_else')
        }).throw()
    })
})
