import ensurePermission from '../../utils/ensurePermission.js'

import TeamApplications from './Applications/index.vue'
import TeamAuditLog from './AuditLog.vue'
import TeamBilling from './Billing.vue'
import TeamDevices from './Devices/index.vue'
import TeamInstances from './Instances.vue'
import Library from './Library/index.vue'
import LibraryRoutes from './Library/routes.js'
import TeamMembersMembers from './Members/General.vue'
import TeamMembersInvitations from './Members/Invitations.vue'
import TeamMembers from './Members/index.vue'
import TeamSettingsDanger from './Settings/Danger.vue'
import TeamSettingsDevices from './Settings/Devices.vue'
import TeamSettingsGeneral from './Settings/General.vue'
import TeamSettings from './Settings/index.vue'
import ChangeTeamType from './changeType.vue'
import CreateTeam from './create.vue'
import CreateApplication from './createApplication.vue'
import CreateInstance from './createInstance.vue'

import Team from './index.vue'

export default [
    {
        path: '/team/create',
        name: 'CreateTeam',
        beforeEnter: ensurePermission('team:create'),
        component: CreateTeam,
        meta: {
            title: 'Create Team'
        }
    },
    {
        path: '/team/:team_slug',
        redirect: to => {
            return `/team/${to.params.team_slug}/applications`
        },
        name: 'Team',
        component: Team,
        meta: {
            title: 'Team - Overview'
        },
        children: [
            {
                path: 'applications',
                name: 'Applications',
                component: TeamApplications,
                meta: {
                    title: 'Team - Applications'
                }
            },
            {
                path: 'instances',
                name: 'Instances',
                component: TeamInstances,
                meta: {
                    title: 'Team - Instances'
                }
            },
            {
                name: 'TeamDevices',
                path: 'devices',
                component: TeamDevices,
                meta: {
                    title: 'Team - Devices'
                }
            },
            {
                name: 'TeamLibrary',
                path: 'library',
                component: Library,
                meta: {
                    title: 'Team - Library'
                },
                redirect: to => {
                    return { name: 'LibraryTeamLibrary' }
                },
                children: [...LibraryRoutes]
            },
            {
                path: 'members',
                component: TeamMembers,
                meta: {
                    title: 'Team - Members'
                },
                redirect: to => {
                    return `/team/${to.params.team_slug}/members/general`
                },
                children: [
                    { path: 'general', component: TeamMembersMembers },
                    { path: 'invitations', component: TeamMembersInvitations }
                ]
            },
            {
                path: 'audit-log',
                component: TeamAuditLog,
                meta: {
                    title: 'Team - Audit Log'
                }
            },
            {
                name: 'TeamChangeType',
                path: 'settings/change-type',
                component: ChangeTeamType,
                meta: {
                    title: 'Team - Change Type'
                }
            },
            {
                name: 'TeamSettings',
                path: 'settings',
                component: TeamSettings,
                meta: {
                    title: 'Team - Settings'
                },
                redirect: to => {
                    return `/team/${to.params.team_slug}/settings/general`
                },
                children: [
                    { path: 'general', component: TeamSettingsGeneral },
                    // { path: 'permissions', component: TeamSettingsPermissions},
                    { path: 'devices', name: 'TeamSettingsDevices', component: TeamSettingsDevices },
                    { path: 'danger', component: TeamSettingsDanger }
                ]
            },
            {
                path: 'billing',
                component: TeamBilling,
                meta: {
                    title: 'Team - Billing'
                }
            },
            {
                path: 'overview',
                redirect: to => {
                    return `/team/${to.params.team_slug}/applications`
                }
            }
        ]
    },
    {
        path: '/team/:team_slug/applications/create',
        name: 'CreateTeamApplication',
        component: CreateApplication,
        meta: {
            title: 'Team - Create Application'
        }
    },
    {
        path: '/team/:team_slug/instances/create',
        name: 'CreateInstance',
        component: CreateInstance,
        meta: {
            title: 'Team - Create Instance'
        }
    },
    {
        path: '/deploy/blueprint',
        component: CreateInstance,
        name: 'DeployBlueprint',
        meta: {
            title: 'Deploy Blueprint'
        }
    }
]
