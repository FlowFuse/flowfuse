import Project from "@/pages/project/index.vue"
import ProjectOverview from "@/pages/project/Overview.vue"
import ProjectSettings from "@/pages/project/Settings.vue"
import ProjectSettingsGeneral from "@/pages/project/Settings/General.vue"
import ProjectSettingsDanger from "@/pages/project/Settings/Danger.vue"
import ProjectSettingsEnvVar from "@/pages/project/Settings/Environment.vue"
import ProjectDebug from "@/pages/project/Debug.vue"
import ProjectDeploys from "@/pages/project/Deploys.vue"
import ProjectActivity from "@/pages/project/Activity.vue"


import CreateProject from "@/pages/project/create.vue"

export default [
    {
        path: '/project/:id',
        redirect: to => {
            return `/project/${to.params.id}/overview`
        },
        name: 'Project',
        component: Project,
        children: [
            { path: 'overview', component: ProjectOverview },
            {
                path: 'settings', component: ProjectSettings,
                redirect: to => {
                    return `/project/${to.params.id}/settings/general`
                },
                children: [
                    { path: 'general', component: ProjectSettingsGeneral },
                    { path: 'environment', component: ProjectSettingsEnvVar },
                    { path: 'danger', component: ProjectSettingsDanger }
                ]
            },
            { path: 'deploys', component: ProjectDeploys},
            { path: 'activity', component: ProjectActivity},
            { path: 'debug', component: ProjectDebug }
        ],
    },
    {
        path: '/create',
        name: 'CreateProject',
        component: CreateProject
    }
]
