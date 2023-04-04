/**
 * INFO: Instances were previously called projects, lots of the code still refers to an instance as a project
 * For all code under src/pages/instance project and instance are synonymous, but instance should be used going forward.
 */
import InstanceAuditLog from './AuditLog.vue'
import InstanceLogs from './Logs.vue'
import InstanceOverview from './Overview.vue'
import InstanceRemoteInstances from './Devices.vue'
import InstanceSettings from './Settings/index.vue'
import InstanceSettingsRoutes from './Settings/routes.js'
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
                path: 'audit-log',
                component: InstanceAuditLog,
                meta: {
                    title: 'Instance - Activity'
                }
            },
            {
                path: 'logs',
                component: InstanceLogs,
                meta: {
                    title: 'Instance - Logs'
                }
            },
            {
                path: 'devices',
                name: 'InstanceRemoteInstances',
                component: InstanceRemoteInstances,
                meta: {
                    title: 'Instance - Remote Instances'
                }
            },
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
                path: 'snapshots',
                name: 'InstanceSnapshots',
                component: InstanceSnapshots,
                meta: {
                    title: 'Instance - Snapshots'
                }
            }
        ]
    }
]
