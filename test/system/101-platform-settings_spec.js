const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Platform Settings', function () {
    // forge - this will be the running FF application we are testing
    let forge
    // inbox - a local transport we can use to capture email without an SMTP server
    const inbox = new LocalTransport()

    const TestObjects = {}
    const testStartTime = new Date()
    const TCS_REQUIRED = 'user:tcs-required'
    const TCS_URL = 'user:tcs-url'
    const TCS_DATE = 'user:tcs-date'
    const getTcsSettings = () => {
        return {
            tcsRequired: forge.settings.get(TCS_REQUIRED),
            tcsUrl: forge.settings.get(TCS_URL),
            tcsDate: forge.settings.get(TCS_DATE)
        }
    }

    // TODO: re-introduce the below once #1183 is complete
    // async function getAuditLog (limit = 1) {
    //     const logEntries = await forge.db.models.AuditLog.forPlatform({ limit: limit || 1 })
    //     const logRaw = [...(logEntries.log || [])]
    //     const result = forge.db.views.AuditLog.auditLog(logEntries)
    //     return { log: result.log, logRaw }
    // }

    before(async function () {
        // Create the FF application with a suitable test configuration
        forge = await FF_UTIL.setupApp({
            telemetry: { enabled: false },
            logging: {
                level: 'warn'
            },
            driver: {
                type: 'stub'
            },
            db: {
                type: 'sqlite',
                storage: ':memory:'
            },
            email: {
                enabled: true,
                transport: inbox
            }
        })
        forge.defaultTeamType = await forge.db.models.TeamType.findOne()

        // Setup the database with basic artefacts

        await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })

        TestObjects.alice = await forge.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword', tcs_accepted: new Date(2022, 1, 1) })
        TestObjects.bob = await forge.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, tcs_accepted: null, password: 'bbPassword' })

        TestObjects.ATeam = await forge.db.models.Team.create({ name: 'ATeam', TeamTypeId: forge.defaultTeamType.id })
        await TestObjects.ATeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })

        TestObjects.BTeam = await forge.db.models.Team.create({ name: 'BTeam', TeamTypeId: forge.defaultTeamType.id })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
    })

    after(function () {
        return forge.close()
    })

    it('admin can setup terms and conditions', async function () {
        const response = await forge.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'alice', password: 'aaPassword', remember: false }
        })
        response.should.have.property('statusCode', 200)
        response.cookies.should.have.length(1)
        TestObjects.aliceToken = response.cookies[0].value

        const tcsInitial = getTcsSettings()
        tcsInitial.should.have.property('tcsRequired', false)
        tcsInitial.should.have.property('tcsUrl', '')
        tcsInitial.should.have.property('tcsDate', null)

        // enable tcs
        const put1 = await forge.inject({
            method: 'PUT',
            url: '/api/v1/settings',
            cookies: { sid: TestObjects.aliceToken },
            payload: {
                [TCS_REQUIRED]: true,
                [TCS_URL]: 'http://a.b.c'
            }
        })
        put1.should.have.property('statusCode', 200)

        const pass1 = getTcsSettings()
        pass1.should.have.property('tcsRequired', true)
        pass1.should.have.property('tcsUrl', 'http://a.b.c')
        pass1.should.have.property('tcsDate', null)

        // update tcs
        const put2 = await forge.inject({
            method: 'PUT',
            url: '/api/v1/settings',
            cookies: { sid: TestObjects.aliceToken },
            payload: {
                'user:tcs-updated': true // sending true will update the tcs-date
            }
        })
        put2.should.have.property('statusCode', 200)

        const pass2 = getTcsSettings()
        should(pass2.tcsRequired).be.true()
        should(pass2.tcsUrl).be.eql('http://a.b.c')
        should(pass2.tcsDate).be.greaterThanOrEqual(testStartTime)

        // ensure platform audit log entry is made
        // TODO: re-introduce audit log tests below once #1183 is complete
        // const auditLogs = await getAuditLog(1)
        // auditLogs.log[0].should.have.a.property('body').and.be.a.String()
        // const body = JSON.parse(auditLogs.log[0].body)
        // body.should.have.a.property('changes').and.be.an.Object()
        // auditLogs.log[0].should.have.a.property('event', 'platform.settings.updated')
        // auditLogs.log[0].should.have.a.property('username', 'alice') // admin user
        // auditLogs.logRaw[0].should.have.a.property('entityId', null) // should be null
    })

    it('non-admin can not setup terms and conditions', async function () {
        const response = await forge.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'bob', password: 'bbPassword', remember: false }
        })
        response.should.have.property('statusCode', 200)
        response.cookies.should.have.length(1)
        TestObjects.bobToken = response.cookies[0].value

        const tcsInitial = getTcsSettings()
        should(tcsInitial.tcsRequired).be.true()
        should(tcsInitial.tcsUrl).be.eql('http://a.b.c')
        should(tcsInitial.tcsDate).be.greaterThanOrEqual(testStartTime)

        // enable tcs
        const put1 = await forge.inject({
            method: 'PUT',
            url: '/api/v1/settings',
            cookies: { sid: TestObjects.bobToken },
            payload: {
                [TCS_REQUIRED]: false,
                [TCS_URL]: 'http://e.f.g',
                'user:tcs-updated': true
            }
        })

        put1.should.have.property('statusCode', 401) // 401: {error: 'unauthorized'} from app.verifyAdmin

        const pass1 = getTcsSettings()
        pass1.should.have.property('tcsRequired', true) // unchanged
        pass1.should.have.property('tcsUrl', 'http://a.b.c') // unchanged
        pass1.should.have.property('tcsDate', tcsInitial.tcsDate) // unchanged
    })
})
