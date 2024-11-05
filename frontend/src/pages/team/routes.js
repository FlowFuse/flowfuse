import ensurePermission from '../../utils/ensurePermission.js'

import TeamApplications from './Applications/index.vue'
import TeamAuditLog from './AuditLog.vue'
import TeamBilling from './Billing.vue'
import Broker from './Broker/index.vue'
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
            title: 'Create Team',
            menu: 'back',
            backTo: (team) => {
                return {
                    label: 'Back to Dashboard',
                    to: { name: 'Team', params: { team_slug: team.slug } }
                }
            }
        }
    },
    {
        path: '/team/:team_slug',
        redirect: { name: 'Applications' },
        name: 'Team',
        component: Team,
        meta: {
            title: 'Team - Overview'
        },
        children: [
            {
                name: 'Applications',
                path: 'applications',
                component: TeamApplications,
                meta: {
                    title: 'Team - Applications'
                }
            },
            {
                name: 'Instances',
                path: 'instances',
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
                redirect: { name: 'LibraryTeamLibrary' },
                children: [...LibraryRoutes]
            },
            {
                name: 'TeamBroker',
                path: 'broker',
                component: Broker,
                meta: {
                    title: 'Team - Broker'
                }
            },
            {
                name: 'TeamMembers',
                path: 'members',
                component: TeamMembers,
                meta: {
                    title: 'Team - Members'
                },
                redirect: { name: 'TeamMembers' },
                children: [
                    { path: 'general', name: 'TeamMembers', component: TeamMembersMembers },
                    { path: 'invitations', component: TeamMembersInvitations }
                ]
            },
            {
                name: 'AuditLog',
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
                    title: 'Team - Change Type',
                    menu: 'back'
                }
            },
            {
                name: 'TeamSettings',
                path: 'settings',
                component: TeamSettings,
                meta: {
                    title: 'Team - Settings'
                },
                redirect: { name: 'team-settings-general' },
                children: [
                    { name: 'team-settings-general', path: 'general', component: TeamSettingsGeneral },
                    { name: 'TeamSettingsDevices', path: 'devices', component: TeamSettingsDevices },
                    { name: 'team-settings-danger', path: 'danger', component: TeamSettingsDanger }
                ]
            },
            {
                name: 'Billing',
                path: 'billing',
                component: TeamBilling,
                meta: {
                    title: 'Team - Billing'
                }
            },
            {
                name: 'team-overview',
                path: 'overview',
                redirect: { name: 'Applications' }
            }
        ]
    },
    {
        path: '/team/:team_slug/applications/create',
        name: 'CreateTeamApplication',
        component: CreateApplication,
        meta: {
            title: 'Team - Create Application',
            menu: 'back'
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
