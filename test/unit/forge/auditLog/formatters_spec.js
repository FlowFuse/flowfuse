const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')

/** @type {import('../../../../forge/auditLog/formatters')} */
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
            license: '',
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

    it('Throw an error for invalid diff type', async function () {
        try {
            Formatters.updatesObject('key1', 1, 2, 'invalid')
            should.fail('Should have thrown an invalid diff type error')
        } catch (error) {
            error.should.have.a.property('code', 'invalid_value')
            error.should.have.a.property('message')
        }
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
            id: '5',
            hashid: '<hashid>',
            name: '<name>',
            username: '<username>',
            email: '<email>'
        })

        should(user).be.an.Object()
        should(user).have.property('id', 5)
        should(user).have.property('hashid', '<hashid>')
        should(user).have.property('name', '<name>')
        should(user).have.property('username', '<username>')
        should(user).have.property('email', '<email>')

        // extended tests to ensure no exceptions / stack overflow and that results are consistent
        // common values
        const unknownUnknown = { id: null, hashid: null, name: null, username: null, email: null }
        const id0SystemUser = { id: 0, hashid: 'system', name: 'FlowFuse Platform', username: 'system', email: null }
        const id1NoHashNoName = { id: 1, hashid: null, name: null, username: null, email: null }
        const idNullHashAbc = { id: null, hashid: 'abc', name: null, username: null, email: null }
        // test cases
        Formatters.userObject(null).should.eql(unknownUnknown)
        Formatters.userObject(null, null).should.eql(unknownUnknown)
        Formatters.userObject(undefined, undefined).should.eql(unknownUnknown)
        Formatters.userObject({}).should.eql(unknownUnknown)
        Formatters.userObject({ id: null }).should.eql(unknownUnknown)
        Formatters.userObject({ hashid: null }).should.eql(unknownUnknown)
        Formatters.userObject({ id: {} }).should.eql(unknownUnknown)
        Formatters.userObject({ id: undefined }).should.eql(unknownUnknown)

        Formatters.userObject(0).should.eql(id0SystemUser)
        Formatters.userObject(0, null).should.eql(id0SystemUser)
        Formatters.userObject(0, undefined).should.eql(id0SystemUser)
        Formatters.userObject({ id: 0 }, null).should.eql(id0SystemUser)
        Formatters.userObject({ id: 'system' }, null).should.eql(id0SystemUser)
        Formatters.userObject('system').should.eql(id0SystemUser)

        Formatters.userObject(1).should.eql(id1NoHashNoName)
        Formatters.userObject(1, null).should.eql(id1NoHashNoName)
        Formatters.userObject({ id: 1 }).should.eql(id1NoHashNoName)

        Formatters.userObject('abc').should.eql(idNullHashAbc)
        Formatters.userObject({ id: 'abc' }).should.eql(idNullHashAbc)

        Formatters.userObject({ id: 123 }).should.eql({ id: 123, hashid: null, name: null, username: null, email: null })
        Formatters.userObject({ id: '123' }).should.eql({ id: 123, hashid: null, name: null, username: null, email: null })
        Formatters.userObject({ id: 456, hashid: 'def', name: 'ted', username: 'steady teddy' }, 'dunno').should.eql({ id: 456, hashid: 'def', name: 'ted', username: 'steady teddy', email: 'dunno' })
        Formatters.userObject({ id: 456, hashid: 'def', name: 'ted', email: 'superted@jungle-treehouse.amazon' }, 'dunno').should.eql({ id: 456, hashid: 'def', name: 'ted', username: 'dunno', email: 'superted@jungle-treehouse.amazon' })
    })

    it('Generated a projectObject with the correct format', async function () {
        const projectEmpty = Formatters.projectObject()
        should(projectEmpty).be.an.Object()
        should(projectEmpty).have.property('id', null)
        should(projectEmpty).have.property('name', null)

        const project = Formatters.projectObject({
            hashid: '<hashid>',
            name: '<name>',
            id: '<id>',
            password: '<password>'
        })

        should(project).be.an.Object()
        should(project).have.property('id', '<id>')
        should(project).have.property('name', '<name>')
        should(project).have.not.property('hashid')
        should(project).have.not.property('password')
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

    // it('Generated a licenseObject with the correct format', async function () {
    //     const licenseEmpty = Formatters.licenseObject()
    //     should(licenseEmpty).be.an.Object()
    //     should(licenseEmpty).have.property('id', null)

    //     const license = Formatters.licenseObject({
    //         id: '<id>'
    //     })

    //     should(license).be.an.Object()
    //     should(license).have.property('id', '<id>')
    // })

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
        should(triggerEmpty).have.property('name', 'unknown')

        const triggerPlatform = Formatters.triggerObject(0)

        should(triggerPlatform).be.an.Object()
        should(triggerPlatform).have.property('id', 0)
        should(triggerPlatform).have.property('hashid', 'system')
        should(triggerPlatform).have.property('type', 'system')
        should(triggerPlatform).have.property('name', 'FlowFuse Platform')

        const triggerUserHash = Formatters.triggerObject('<hash>', {
            email: '<email>'
        })

        should(triggerUserHash).be.an.Object()
        should(triggerUserHash).have.property('id', null)
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

        // extended tests to ensure no exceptions / stack overflow and that results are consistent
        // common values
        const unknownUnknown = { id: null, hashid: null, type: 'unknown', name: 'unknown' }
        const id0SystemUser = { id: 0, hashid: 'system', type: 'system', name: 'FlowFuse Platform' }
        const id1NoHashNoName = { id: 1, hashid: null, type: 'user', name: 'unknown' }
        const idNullHashAbc = { id: null, hashid: 'abc', type: 'user', name: 'unknown' }
        // test cases
        Formatters.triggerObject(null, null).should.eql(unknownUnknown)
        Formatters.triggerObject(undefined, undefined).should.eql(unknownUnknown)
        Formatters.triggerObject(null, {}).should.eql(unknownUnknown)
        Formatters.triggerObject(null, { id: null }).should.eql(unknownUnknown)
        Formatters.triggerObject({}).should.eql(unknownUnknown)
        Formatters.triggerObject({}, 0).should.eql(unknownUnknown)
        Formatters.triggerObject({}, 1).should.eql(unknownUnknown)
        Formatters.triggerObject({ id: null }).should.eql(unknownUnknown)
        Formatters.triggerObject({ id: null }, { id: null }).should.eql(unknownUnknown)
        Formatters.triggerObject({ id: null }, { id: undefined }).should.eql(unknownUnknown)
        Formatters.triggerObject({ id: null }, 'abc').should.eql(unknownUnknown)
        Formatters.triggerObject({ id: null }, 123).should.eql(unknownUnknown)
        Formatters.triggerObject({ id: null }, '123').should.eql(unknownUnknown)

        Formatters.triggerObject(0).should.eql(id0SystemUser)
        Formatters.triggerObject(0, null).should.eql(id0SystemUser)
        Formatters.triggerObject('system').should.eql(id0SystemUser)
        Formatters.triggerObject(null, 0).should.eql(id0SystemUser)
        Formatters.triggerObject(null, 'system').should.eql(id0SystemUser)
        Formatters.triggerObject(null, { id: 0 }).should.eql(id0SystemUser)
        Formatters.triggerObject({ id: null }, { id: 0 }).should.eql(id0SystemUser)
        Formatters.triggerObject(0, null).should.eql(id0SystemUser)
        Formatters.triggerObject(0, undefined).should.eql(id0SystemUser)
        Formatters.triggerObject(0, {}).should.eql(id0SystemUser)

        Formatters.triggerObject(1).should.eql(id1NoHashNoName)
        Formatters.triggerObject(1, null).should.eql(id1NoHashNoName)
        Formatters.triggerObject(1, {}).should.eql(id1NoHashNoName)
        Formatters.triggerObject(null, 1).should.eql(id1NoHashNoName)
        Formatters.triggerObject(null, { id: 1 }).should.eql(id1NoHashNoName)
        Formatters.triggerObject({ id: 1 }, { id: 1 }).should.eql(id1NoHashNoName)
        Formatters.triggerObject({ id: null }, { id: 1 }).should.eql(id1NoHashNoName)
        Formatters.triggerObject({ id: undefined }, { id: 1 }).should.eql(id1NoHashNoName)
        Formatters.triggerObject({ id: null }, { id: 1 }).should.eql(id1NoHashNoName)

        Formatters.triggerObject('abc', '123').should.eql(idNullHashAbc)
        Formatters.triggerObject('abc', {}).should.eql(idNullHashAbc)
        Formatters.triggerObject('abc', { id: 'abc' }).should.eql(idNullHashAbc)
        Formatters.triggerObject({ id: null }, { id: 'abc' }).should.eql(idNullHashAbc)
        Formatters.triggerObject(null, 'abc').should.eql(idNullHashAbc)

        Formatters.triggerObject('abc', { id: 123 }).should.eql({ id: 123, hashid: 'abc', type: 'user', name: 'unknown' })
        Formatters.triggerObject('abc', { id: '123' }).should.eql({ id: 123, hashid: 'abc', type: 'user', name: 'unknown' })
        Formatters.triggerObject({ id: null }, { id: '123' }).should.eql({ id: 123, hashid: null, type: 'user', name: 'unknown' })
        Formatters.triggerObject({ id: null }, { id: '123', hashid: 'abc' }).should.eql({ id: 123, hashid: 'abc', type: 'user', name: 'unknown' })
        Formatters.triggerObject({ id: null }, { id: '123', hashid: 'abc', type: 'user', name: 'test' }).should.eql({ id: 123, hashid: 'abc', type: 'user', name: 'test' })
        Formatters.triggerObject({ id: null }, { id: '123', hashid: 'abc', type: 'user', email: 'foo@bar.baz' }).should.eql({ id: 123, hashid: 'abc', type: 'user', name: 'foo' })
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

    describe('Formats Node-RED audit log entries', async function () {
        it('Includes the event data for `flows.set` event', async function () {
            // can get away with passing empty objects here
            // as we test format for each object in following tests
            const entry = Formatters.formatLogEntry({
                hashid: '<hashid>',
                UserId: {},
                User: {},
                event: 'flows.set',
                createdAt: '<datetime>',
                entityId: '<entityId>',
                entityType: '<entityType>',
                body: { type: 'full', ip: '127.0.0.1' }
            })

            should(entry).have.property('body')
            should(entry.body).be.an.Object()
            entry.body.should.have.property('flowsSet').and.be.an.Object()
            entry.body.flowsSet.should.only.have.keys('type')
            entry.body.flowsSet.type.should.equal('full')
        })
    })
})
