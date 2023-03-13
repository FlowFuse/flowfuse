/**
 * WARNING: There is ongoing work to move project functionality up into applications
 * or down into instances.
 *
 * No new functionality should be added here.
 */
import Project from '@/pages/project/index.vue'
import ProjectOverview from '@/pages/project/Overview.vue'
import ProjectActivity from '@/pages/project/Activity.vue'
import ProjectLogs from '@/pages/project/Logs.vue'
import ProjectSettings from '@/pages/project/Settings.vue'

export default [
    {
        path: '/project/:id',
        redirect: to => {
            return `/project/${to.params.id}/instances`
        },
        name: 'Project',
        component: Project,
        meta: {
            title: 'Application - Overview'
        },
        children: [
            {
                path: 'instances',
                component: ProjectOverview,
                meta: {
                    title: 'Application - Instances'
                }
            },
            {
                path: 'settings',
                component: ProjectSettings,
                meta: {
                    title: 'Application - Settings'
                }
            },
            {
                path: 'logs',
                component: ProjectLogs,
                meta: {
                    title: 'Application - Logs'
                }
            },
            {
                path: 'activity',
                component: ProjectActivity,
                meta: {
                    title: 'Application - Activity'
                }
            }
            // { path: 'debug', component: ProjectDebug }
        ]
    }
]
