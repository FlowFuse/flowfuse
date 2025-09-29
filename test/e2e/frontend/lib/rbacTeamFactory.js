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

    // Factory function to create applications with full resources
    async function createApplicationWithResources (applicationConfig) {
        const {
            name,
            description
        } = applicationConfig

        // Create application
        const application = await factory.createApplication({
            name,
            description
        }, rbacTeam)

        // Create instance
        const instance = await factory.createInstance(
            { name: `${name}-instance-1` },
            application,
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

        // Create devices
        const appDevice = await factory.createDevice({
            name: `${name}-app-device`,
            type: 'type2'
        }, rbacTeam, null, application)

        const instanceDevice = await factory.createDevice({
            name: `${name}-instance-1-device`,
            type: 'type2'
        }, rbacTeam, instance, null)

        // Create snapshots
        await factory.createSnapshot({ name: 'snapshot 1' }, instance, ownerOwen)
        await factory.createDeviceSnapshot({ name: 'device snapshot 1' }, appDevice, ownerOwen)

        // create Device Groups
        await factory.createApplicationDeviceGroup({
            name: `${name} group 1`,
            description: `${name} group 1 description`
        }, application)

        return {
            application,
            instance,
            appDevice,
            instanceDevice
        }
    }

    // Create all applications using the factory
    const applicationConfigs = [
        {
            name: 'application-1',
            description: 'Every user will have the Owner role'
        },
        {
            name: 'application-2',
            description: 'Every user will have the Member role'
        },
        {
            name: 'application-3',
            description: 'Every user will have the Viewer role'
        },
        {
            name: 'application-4',
            description: 'Every user will have the Dashboard role'
        },
        {
            name: 'application-5',
            description: 'Every user will have the None role'
        },
        {
            name: 'application-6',
            description: 'Every user will have their original team role'
        }
    ]

    const applications = []
    for (const config of applicationConfigs) {
        const appData = await createApplicationWithResources(config)
        applications.push({
            ...appData,
            config
        })
    }

    // Extract applications for role assignment (excluding app-6 which is not assigned a custom application role)
    const [application1, application2, application3, application4, application5] = applications.slice(0, 5).map(app => app.application)

    const roleAssignments = [
        {
            user: ownerOwen,
            applications: [application1, application2, application3, application4, application5],
            roles: [Roles.None, Roles.Dashboard, Roles.Viewer, Roles.Member, Roles.Owner]
        },
        {
            user: memberMike,
            applications: [application1, application2, application3, application4, application5],
            roles: [Roles.None, Roles.Dashboard, Roles.Viewer, Roles.Member, Roles.Owner]
        },
        {
            user: viewerVictor,
            applications: [application1, application2, application3, application4, application5],
            roles: [Roles.None, Roles.Dashboard, Roles.Viewer, Roles.Member, Roles.Owner]
        },
        {
            user: dashboardDan,
            applications: [application1, application2, application3, application4, application5],
            roles: [Roles.None, Roles.Dashboard, Roles.Viewer, Roles.Member, Roles.Owner]
        },
        {
            user: noRoleBarry,
            applications: [application1, application2, application3, application4, application5],
            roles: [Roles.None, Roles.Dashboard, Roles.Viewer, Roles.Member, Roles.Owner]
        }
    ]

    // Assign roles using the configuration
    //  Each user will have:
    //      - Restricted role (0) on application 1
    //      - Dashboard role (5) on application 2
    //      - Viewer role (10) on application 3
    //      - Member role (30) on application 4
    //      - Owner role (50) on application 5
    //      - Default team role on application 6
    for (const assignment of roleAssignments) {
        for (let i = 0; i < assignment.applications.length; i++) {
            await assignCustomRoleToApplication(assignment.user, assignment.applications[i], assignment.roles[i])
        }
    }
}
