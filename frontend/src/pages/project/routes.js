import Project from '@/pages/project/index.vue'
import ProjectOverview from '@/pages/project/Overview.vue'
import ProjectSettings from '@/pages/project/Settings/index.vue'
import ProjectSettingsGeneral from '@/pages/project/Settings/General.vue'
import ProjectSettingsDanger from '@/pages/project/Settings/Danger.vue'
import ProjectSettingsEditor from '@/pages/project/Settings/Editor.vue'
import ProjectSettingsPalette from '@/pages/project/Settings/Palette.vue'
import ProjectSettingsEnvVar from '@/pages/project/Settings/Environment.vue'
// import ProjectDebug from '@/pages/project/Debug.vue'
// import ProjectDeploys from '@/pages/project/Deploys.vue'
import ProjectDevices from '@/pages/project/Devices.vue'
import ProjectLogs from '@/pages/project/Logs.vue'
import ProjectActivity from '@/pages/project/Activity.vue'

import CreateProject from '@/pages/project/create.vue'

export default [
    {
        path: '/project/:id',
        redirect: to => {
            return `/project/${to.params.id}/overview`
        },
        name: 'Project',
        component: Project,
        meta: {
            title: 'Project - Overview'
        },
        children: [
            { path: 'overview', component: ProjectOverview },
            {
                path: 'settings',
                component: ProjectSettings,
                meta: {
                    title: 'Project - Settings'
                },
                redirect: to => {
                    return `/project/${to.params.id}/settings/general`
                },
                children: [
                    { path: 'general', component: ProjectSettingsGeneral },
                    { path: 'environment', component: ProjectSettingsEnvVar },
                    { path: 'editor', component: ProjectSettingsEditor },
                    { path: 'palette', component: ProjectSettingsPalette },
                    { path: 'danger', component: ProjectSettingsDanger }
                ]
            },
            {
                path: 'devices',
                component: ProjectDevices,
                meta: {
                    title: 'Project - Devices'
                }
            },
            {
                path: 'logs',
                component: ProjectLogs,
                meta: {
                    title: 'Project - Logs'
                }
            },
            // { path: 'deploys', component: ProjectDeploys},
            {
                path: 'activity',
                component: ProjectActivity,
                meta: {
                    title: 'Project - Activity'
                }
            }
            // { path: 'debug', component: ProjectDebug }
        ]
    },
    {
        path: '/create',
        name: 'CreateProject',
        component: CreateProject
    }
]
