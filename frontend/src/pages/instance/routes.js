/**
 * INFO: Instances were previously called projects, lots of the code still refers to an instance as a project
 * For all code under src/pages/instance project and instance are synonymous, but instance should be used going forward.
 */
import InstanceAuditLog from './AuditLog.vue'
import InstanceRemoteInstances from './Devices.vue'
import InstanceLogs from './Logs.vue'
import InstanceOverview from './Overview.vue'
import InstanceSettings from './Settings/index.vue'
import InstanceSettingsRoutes from './Settings/routes.js'
import InstanceSnapshots from './Snapshots/index.vue'
import Instance from './index.vue'

const children = [
    {
        path: 'overview',
        name: 'instance-overview',
        component: InstanceOverview
    },
    {
        path: 'audit-log',
        name: 'instance-audit-log',
        component: InstanceAuditLog,
        meta: {
            title: 'Instance - Activity'
        }
    },
    {
        path: 'logs',
        name: 'instance-logs',
        component: InstanceLogs,
        meta: {
            title: 'Instance - Logs',
            shouldPoll: true
        }
    },
    {
        path: 'devices',
        name: 'instance-devices',
        component: InstanceRemoteInstances,
        meta: {
            title: 'Instance - Remote Instances'
        }
    },
    {
        path: 'settings',
        component: InstanceSettings,
        name: 'instance-settings',
        meta: {
            title: 'Instance - Settings'
        },
        redirect: to => {
            return { name: 'instance-settings-general', params: { id: to.params.id } }
        },
        children: [...InstanceSettingsRoutes]
    },
    {
        path: 'snapshots',
        name: 'instance-snapshots',
        component: InstanceSnapshots,
        meta: {
            title: 'Instance - Snapshots'
        }
    }
]

export { children }

export default [
    {
        path: '/instance/:id/:remaining*',
        redirect: to => {
            return { name: 'instance-overview', params: { id: to.params.id } }
        },
        name: 'Instance',
        component: Instance,
        meta: {
            title: 'Instance - Overview'
        },
        children
    }
]
