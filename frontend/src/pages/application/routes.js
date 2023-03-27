/**
 * WARNING: There is ongoing work to move Application functionality up into applications
 * or down into instances.
 *
 * No new functionality should be added here.
 */
import ApplicationActivity from '@/pages/application/Activity.vue'
import ApplicationLogs from '@/pages/application/Logs.vue'
import ApplicationOverview from '@/pages/application/Overview.vue'
import ApplicationSettings from '@/pages/application/Settings.vue'
import ApplicationIndex from '@/pages/application/index.vue'

export default [
    {
        path: '/application/:id',
        redirect: to => {
            return `/application/${to.params.id}/instances`
        },
        name: 'Application',
        component: ApplicationIndex,
        meta: {
            title: 'Application - Overview'
        },
        children: [
            {
                path: 'instances',
                component: ApplicationOverview,
                meta: {
                    title: 'Application - Instances'
                }
            },
            {
                path: 'settings',
                component: ApplicationSettings,
                meta: {
                    title: 'Application - Settings'
                }
            },
            {
                path: 'logs',
                component: ApplicationLogs,
                meta: {
                    title: 'Application - Logs'
                }
            },
            {
                path: 'activity',
                component: ApplicationActivity,
                meta: {
                    title: 'Application - Activity'
                }
            }
            // { path: 'debug', component: ApplicationDebug }
        ]
    }
]
