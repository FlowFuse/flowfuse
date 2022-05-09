import Team from '@/pages/team/index.vue'
import TeamOverview from '@/pages/team/Overview.vue'
import TeamProjects from '@/pages/team/Projects.vue'
import TeamDevices from '@/pages/team/Devices/index.vue'
import TeamMembers from '@/pages/team/Members/index.vue'
import TeamMembersMembers from '@/pages/team/Members/General.vue'
import TeamMembersInvitations from '@/pages/team/Members/Invitations.vue'
import TeamAuditLog from '@/pages/team/AuditLog.vue'
import TeamSettings from '@/pages/team/Settings/index.vue'
import TeamSettingsGeneral from '@/pages/team/Settings/General.vue'
import TeamSettingsDanger from '@/pages/team/Settings/Danger.vue'
// import TeamSettingsPermissions from '@/pages/team/Settings/Permissions.vue'
import CreateTeam from '@/pages/team/create.vue'
import CreateProject from '@/pages/team/createProject.vue'

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
            return `/team/${to.params.team_slug}/overview`
        },
        name: 'Team',
        component: Team,
        meta: {
            title: 'Team - Overview'
        },
        children: [
            { path: 'overview', component: TeamOverview },
            {
                path: 'projects',
                name: 'Projects',
                component: TeamProjects,
                meta: {
                    title: 'Team - Projects'
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
        path: '/team/:team_slug/projects/create',
        name: 'CreateTeamProject',
        component: CreateProject,
        props: route => ({
            sourceProjectId: route.query.sourceProject
        }),
        meta: {
            title: 'Team - Create Project'
        }
    }
]
