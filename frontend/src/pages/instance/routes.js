/**
 * INFO: Instances were previously called projects, lots of the code still refers to an instance as a project
 * For all code under src/pages/instance project and instance are synonymous, but instance should be used going forward.
 */
import InstanceAuditLog from './AuditLog.vue'
import InstanceLogs from './Logs.vue'
import InstanceOverview from './Overview.vue'
import InstanceSettings from './Settings/index.vue'
import InstanceSettingsRoutes from './Settings/routes'
import InstanceSnapshots from './Snapshots/index.vue'
import Instance from './index.vue'

export default [
    {
        path: '/instance/:id',
        redirect: to => {
            return `/instance/${to.params.id}/overview`
        },
        name: 'Instance',
        component: Instance,
        meta: {
            title: 'Instance - Overview'
        },
        children: [
            { path: 'overview', component: InstanceOverview },
            {
                path: 'settings',
                component: InstanceSettings,
                meta: {
                    title: 'Instance - Settings'
                },
                redirect: to => {
                    return `/instance/${to.params.id}/settings/general`
                },
                children: [...InstanceSettingsRoutes]
            },
            {
                path: 'logs',
                component: InstanceLogs,
                meta: {
                    title: 'Instance - Logs'
                }
            },
            {
                path: 'snapshots',
                component: InstanceSnapshots,
                meta: {
                    title: 'Instance - Snapshots'
                }
            },
            {
                path: 'audit-log',
                component: InstanceAuditLog,
                meta: {
                    title: 'Instance - Activity'
                }
            }
        ]
    }
]
