const TestModelFactory = require('../../../lib/TestModelFactory.js')

const projectStackFactory = require('./projectStackFactory.js')
const projectTemplateFactory = require('./projectTemplateFactory.js')
const projectTypeFactory = require('./projectTypeFactory.js')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

module.exports = async function (forge) {
    async function assignCustomRoleToApplication (ownerOwen, application, role) {
        const teamMembership = await forge.db.models.TeamMember.findOne({
            where: {
                TeamId: rbacTeam.id,
                UserId: ownerOwen.id
            }
        })
        teamMembership.permissions = {
            applications: {
                ...(teamMembership.permissions.applications || {}),
                ...{ [application.hashid]: role }
            }
        }
        await teamMembership.save()
    }

    const factory = new TestModelFactory(forge)
    const { stack1: stack } = await projectStackFactory.get()
    const { template1: template } = await projectTemplateFactory.get()
    const {
        type1: projectType,
        type2: spareProjectType
    } = await projectTypeFactory.get()

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
                tables: true,
                'shared-library': true,
                ha: true,
                emailAlerts: true,
                protectedInstance: true,
                editorLimits: true,
                staticAssets: true,
                teamBroker: true,
                npm: true,
                instanceResources: true,
                gitIntegration: true,
                projectHistory: true,
                bom: true,
                customHostnames: true,
                instanceAutoSnapshot: true,
                deviceAutoSnapshot: true,
                deviceGroups: true,
                teamHttpSecurity: true,
                projectComms: true,
                fileStorageLimit: 100000,
                contextLimit: 1024,
                certifiedNodes: true,
                generatedSnapshotDescription: true,
                rbacApplication: true,
                assistantInlineCompletions: true
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
    const application1 = await factory.createApplication({
        name: 'application-1',
        description: 'Every user will have the Owner role'
    }, rbacTeam)
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
    const application2 = await factory.createApplication({
        name: 'application-2',
        description: 'Every user will have the Member role'
    }, rbacTeam)
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
    const application3 = await factory.createApplication({
        name: 'application-3',
        description: 'Every user will have the Viewer role'
    }, rbacTeam)
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
    const application4 = await factory.createApplication({
        name: 'application-4',
        description: 'Every user will have the Dashboard role'
    }, rbacTeam)
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
    const application5 = await factory.createApplication({
        name: 'application-5',
        description: 'Every user will have the None role'
    }, rbacTeam)
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
    const application6 = await factory.createApplication({
        name: 'application-6',
        description: 'Every user will have their original team role'
    }, rbacTeam)
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

    await factory.createSnapshot({ name: 'snapshot 1' }, application1Instance1, ownerOwen)
    await factory.createSnapshot({ name: 'snapshot 1' }, application2Instance1, ownerOwen)
    await factory.createSnapshot({ name: 'snapshot 1' }, application3Instance1, ownerOwen)
    await factory.createSnapshot({ name: 'snapshot 1' }, application4Instance1, ownerOwen)
    await factory.createSnapshot({ name: 'snapshot 1' }, application5Instance1, ownerOwen)
    await factory.createSnapshot({ name: 'snapshot 1' }, application6Instance1, ownerOwen)

    await assignCustomRoleToApplication(ownerOwen, application1, Roles.None)
    await assignCustomRoleToApplication(ownerOwen, application2, Roles.Dashboard)
    await assignCustomRoleToApplication(ownerOwen, application3, Roles.Viewer)
    await assignCustomRoleToApplication(ownerOwen, application4, Roles.Member)
    await assignCustomRoleToApplication(ownerOwen, application5, Roles.Owner)

    await assignCustomRoleToApplication(memberMike, application1, Roles.None)
    await assignCustomRoleToApplication(memberMike, application2, Roles.Dashboard)
    await assignCustomRoleToApplication(memberMike, application3, Roles.Viewer)
    await assignCustomRoleToApplication(memberMike, application4, Roles.Member)
    await assignCustomRoleToApplication(memberMike, application5, Roles.Owner)

    await assignCustomRoleToApplication(viewerVictor, application1, Roles.None)
    await assignCustomRoleToApplication(viewerVictor, application2, Roles.Dashboard)
    await assignCustomRoleToApplication(viewerVictor, application3, Roles.Viewer)
    await assignCustomRoleToApplication(viewerVictor, application4, Roles.Member)
    await assignCustomRoleToApplication(viewerVictor, application5, Roles.Owner)

    await assignCustomRoleToApplication(dashboardDan, application1, Roles.None)
    await assignCustomRoleToApplication(dashboardDan, application2, Roles.Dashboard)
    await assignCustomRoleToApplication(dashboardDan, application3, Roles.Viewer)
    await assignCustomRoleToApplication(dashboardDan, application4, Roles.Member)
    await assignCustomRoleToApplication(dashboardDan, application5, Roles.Owner)

    await assignCustomRoleToApplication(noRoleBarry, application1, Roles.None)
    await assignCustomRoleToApplication(noRoleBarry, application2, Roles.Dashboard)
    await assignCustomRoleToApplication(noRoleBarry, application3, Roles.Viewer)
    await assignCustomRoleToApplication(noRoleBarry, application4, Roles.Member)
    await assignCustomRoleToApplication(noRoleBarry, application5, Roles.Owner)
}
