const TestModelFactory = require('../../../lib/TestModelFactory.js')

const projectStackFactory = require('./projectStackFactory.js')
const projectTemplateFactory = require('./projectTemplateFactory.js')
const projectTypeFactory = require('./projectTypeFactory.js')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

module.exports = async function (forge) {
    const factory = new TestModelFactory(forge)
    const { stack1: stack } = await projectStackFactory.get()
    const { template1: template } = await projectTemplateFactory.get()
    const { type1: projectType, type2: spareProjectType } = await projectTypeFactory.get()

    const rbacTeamType = await factory.createTeamType({
        name: 'Rbac Team',
        description: 'team type description',
        active: true,
        order: 4,
        properties: {
            instances: {
                [projectType.hashid]: { active: true },
                [spareProjectType.hashid]: { active: true }
            },
            devices: {},
            users: {},
            features: {
                rbacApplication: true
            },
            billing: {
                disabled: true
            }
        }
    })

    // Create RBAC Team
    const rbacTeam = await factory.createTeam({ name: 'RBAC Team' }, rbacTeamType)

    const adminAllan = await factory.createUser({
        admin: true,
        username: 'adminAllan',
        name: 'Allan Admin',
        email: 'allan-admin@example.com',
        email_verified: true,
        password: 'aaPassword'
    })
    const ownerOwen = await factory.createUser({
        admin: false,
        username: 'ownerOwen',
        name: 'Owner Owen',
        email: 'owner-owen@example.com',
        email_verified: true,
        password: 'ooPassword'
    })
    const memberMike = await factory.createUser({
        admin: false,
        username: 'memberMike',
        name: 'Member Mike',
        email: 'member-mike@example.com',
        email_verified: true,
        password: 'mmPassword'
    })
    const viewerVictor = await factory.createUser({
        admin: false,
        username: 'viewerVictor',
        name: 'Viewer Victor',
        email: 'viewer-victor@example.com',
        email_verified: true,
        password: 'vvPassword'
    })
    const dashboardDan = await factory.createUser({
        admin: false,
        username: 'dashboardDan',
        name: 'Dashboard Dan',
        email: 'dashboard-dan@example.com',
        email_verified: true,
        password: 'ddPassword'
    })
    const noRoleBarry = await factory.createUser({
        admin: false,
        username: 'noRoleBarry',
        name: 'No Role Barry',
        email: 'no-role-barry@example.com',
        email_verified: true,
        password: 'nnPassword'
    })

    await rbacTeam.addUser(adminAllan, { through: { role: Roles.Owner } })
    await rbacTeam.addUser(ownerOwen, { through: { role: Roles.Owner } })
    await rbacTeam.addUser(memberMike, { through: { role: Roles.Member } })
    await rbacTeam.addUser(viewerVictor, { through: { role: Roles.Viewer } })
    await rbacTeam.addUser(dashboardDan, { through: { role: Roles.Dashboard } })
    await rbacTeam.addUser(noRoleBarry, { through: { role: Roles.None } })

    // create application1 with one instance, one device owned by the application, and one device owned by the instance
    const application1 = await factory.createApplication({ name: 'application-1' }, rbacTeam)
    const application1Instance1 = await factory.createInstance(
        { name: 'application-1-instance-1' },
        application1,
        stack,
        template,
        projectType,
        {
            settings: {
                palette: {
                    modules: [
                        {
                            name: '@flowfuse/node-red-dashboard',
                            version: '~1.25.0',
                            local: true
                        }
                    ]
                }
            }
        }
    )
    await factory.createDevice({
        name: 'application-1-app-device',
        type: 'type2'
    }, rbacTeam, null, application1)
    await factory.createDevice({
        name: 'application-1-instance-1-device',
        type: 'type2'
    }, rbacTeam, application1Instance1, null)

    // create application2 with one instance, one device owned by the application, and one device owned by the instance
    const application2 = await factory.createApplication({ name: 'application-2' }, rbacTeam)
    const application2Instance1 = await factory.createInstance(
        { name: 'application-2-instance-1' },
        application2,
        stack,
        template,
        projectType,
        {
            settings: {
                palette: {
                    modules: [
                        {
                            name: '@flowfuse/node-red-dashboard',
                            version: '~1.25.0',
                            local: true
                        }
                    ]
                }
            }
        }
    )
    await factory.createDevice({
        name: 'application-2-app-device',
        type: 'type2'
    }, rbacTeam, null, application2)
    await factory.createDevice({
        name: 'application-2-instance-1-device',
        type: 'type2'
    }, rbacTeam, application2Instance1, null)

    // create application3 with one instance, one device owned by the application, and one device owned by the instance
    const application3 = await factory.createApplication({ name: 'application-3' }, rbacTeam)
    const application3Instance1 = await factory.createInstance(
        { name: 'application-3-instance-1' },
        application3,
        stack,
        template,
        projectType,
        {
            settings: {
                palette: {
                    modules: [
                        {
                            name: '@flowfuse/node-red-dashboard',
                            version: '~1.25.0',
                            local: true
                        }
                    ]
                }
            }
        }
    )
    await factory.createDevice({
        name: 'application-3-app-device',
        type: 'type2'
    }, rbacTeam, null, application3)
    await factory.createDevice({
        name: 'application-3-instance-1-device',
        type: 'type2'
    }, rbacTeam, application3Instance1, null)

    // create application4 with one instance, one device owned by the application, and one device owned by the instance
    const application4 = await factory.createApplication({ name: 'application-4' }, rbacTeam)
    const application4Instance1 = await factory.createInstance(
        { name: 'application-4-instance-1' },
        application4,
        stack,
        template,
        projectType,
        {
            settings: {
                palette: {
                    modules: [
                        {
                            name: '@flowfuse/node-red-dashboard',
                            version: '~1.25.0',
                            local: true
                        }
                    ]
                }
            }
        }
    )
    await factory.createDevice({
        name: 'application-4-app-device',
        type: 'type2'
    }, rbacTeam, null, application4)
    await factory.createDevice({
        name: 'application-4-instance-1-device',
        type: 'type2'
    }, rbacTeam, application4Instance1, null)

    // create application6 with one instance, one device owned by the application, and one device owned by the instance
    const application5 = await factory.createApplication({ name: 'application-5' }, rbacTeam)
    const application5Instance1 = await factory.createInstance(
        { name: 'application-5-instance-1' },
        application5,
        stack,
        template,
        projectType,
        {
            settings: {
                palette: {
                    modules: [
                        {
                            name: '@flowfuse/node-red-dashboard',
                            version: '~1.25.0',
                            local: true
                        }
                    ]
                }
            }
        }
    )
    await factory.createDevice({
        name: 'application-5-app-device',
        type: 'type2'
    }, rbacTeam, null, application5)
    await factory.createDevice({
        name: 'application-5-instance-1-device',
        type: 'type2'
    }, rbacTeam, application5Instance1, null)

    // create application6 with one instance, one device owned by the application, and one device owned by the instance
    const application6 = await factory.createApplication({ name: 'application-6' }, rbacTeam)
    const application6Instance1 = await factory.createInstance(
        { name: 'application-6-instance-1' },
        application6,
        stack,
        template,
        projectType,
        {
            settings: {
                palette: {
                    modules: [
                        {
                            name: '@flowfuse/node-red-dashboard',
                            version: '~1.25.0',
                            local: true
                        }
                    ]
                }
            }
        }
    )
    await factory.createDevice({
        name: 'application-6-app-device',
        type: 'type2'
    }, rbacTeam, null, application6)
    await factory.createDevice({
        name: 'application-6-instance-1-device',
        type: 'type2'
    }, rbacTeam, application6Instance1, null)
}
