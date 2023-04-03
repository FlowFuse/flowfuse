import Team from '@/pages/team/index.vue'
import TeamApplications from '@/pages/team/Applications.vue'
import TeamInstances from '@/pages/team/Instances.vue'
import TeamDevices from '@/pages/team/Devices/index.vue'
import TeamLibrary from '@/pages/team/Library.vue'
import TeamMembers from '@/pages/team/Members/index.vue'
import TeamMembersMembers from '@/pages/team/Members/General.vue'
import TeamMembersInvitations from '@/pages/team/Members/Invitations.vue'
import TeamAuditLog from '@/pages/team/AuditLog.vue'
import TeamSettings from '@/pages/team/Settings/index.vue'
import TeamSettingsGeneral from '@/pages/team/Settings/General.vue'
import TeamSettingsDanger from '@/pages/team/Settings/Danger.vue'
import TeamSettingsDevices from '@/pages/team/Settings/Devices.vue'
// import TeamSettingsPermissions from '@/pages/team/Settings/Permissions.vue'
import CreateTeam from '@/pages/team/create.vue'
import CreateApplication from '@/pages/team/createApplication'

// EE Only
import TeamBilling from '@/pages/team/Billing.vue'

import ensurePermission from '@/utils/ensurePermission'

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
                path: 'library/:entryPath*',
                component: TeamLibrary,
                meta: {
                    title: 'Team - Library'
                }
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
    }
]
