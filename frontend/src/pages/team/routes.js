import Team from "@/pages/team/index.vue"
import TeamOverview from "@/pages/team/Overview.vue"
import TeamProjects from "@/pages/team/Projects.vue"
import TeamMembers from "@/pages/team/Members.vue"
import TeamSettings from "@/pages/team/Settings.vue"
import TeamSettingsGeneral from "@/pages/team/Settings/General.vue"
import TeamSettingsDanger from "@/pages/team/Settings/Danger.vue"
import TeamSettingsPermissions from "@/pages/team/Settings/Permissions.vue"
import CreateTeam from "@/pages/team/create.vue"
import CreateProject from "@/pages/project/create.vue"


export default [
    {
        path: '/team/create',
        name: 'CreateTeam',
        component: CreateTeam
    },
    {
        path: '/team/:id',
        redirect: to => {
            return `/team/${to.params.id}/overview`
        },
        name: 'Team',
        component: Team,
        children: [
            { path: 'overview', component: TeamOverview },
            { path: 'projects', component: TeamProjects },
            { path: 'members', component: TeamMembers },
            {
                path: 'settings', component: TeamSettings,
                redirect: to => {
                    return `/team/${to.params.id}/settings/general`
                },
                children: [
                    { path: 'general', component: TeamSettingsGeneral },
                    { path: 'permissions', component: TeamSettingsPermissions},
                    { path: 'danger', component: TeamSettingsDanger }
                ]
            }
        ]
    },
    {
        path: '/team/:id/projects/create',
        name: 'CreateTeamProject',
        component: CreateProject
    }
]
