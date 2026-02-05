// import { useStore } from 'vuex'
import store from '../../store/index.js'

import DeviceAuditLog from './AuditLog.vue'
import DeviceDeveloperMode from './DeveloperMode/index.vue'
import DeviceLogs from './Logs.vue'
import DeviceOverview from './Overview.vue'
import DevicePerformance from './Performance.vue'
import DeviceSettingsDanger from './Settings/Danger.vue'
import DeviceSettingsEnvironment from './Settings/Environment.vue'
import DeviceSettingsGeneral from './Settings/General.vue'
import DeviceSettingsPalette from './Settings/Palette.vue'
import DeviceSettingsSecurity from './Settings/Security.vue'
import DeviceSettings from './Settings/index.vue'
import VersionHistory from './VersionHistory/index.vue'
import VersionHistoryRoutes from './VersionHistory/routes.js'

import Device from './index.vue'

const children = [
    {
        name: 'device-overview',
        path: 'overview',
        component: DeviceOverview
    },
    {
        path: 'settings',
        name: 'device-settings',
        component: DeviceSettings,
        meta: {
            title: 'Device - Settings'
        },
        redirect: { name: 'device-settings-general' },
        children: [
            {
                name: 'device-settings-general',
                path: 'general',
                component: DeviceSettingsGeneral
            },
            {
                name: 'device-settings-environment',
                path: 'environment',
                component: DeviceSettingsEnvironment
            },
            {
                name: 'device-settings-security',
                path: 'security',
                component: DeviceSettingsSecurity
            },
            {
                name: 'device-settings-palette',
                path: 'palette',
                component: DeviceSettingsPalette
            },
            {
                name: 'device-settings-danger',
                path: 'danger',
                component: DeviceSettingsDanger
            }
        ]
    },
    {
        path: 'audit-log',
        name: 'device-audit-log',
        component: DeviceAuditLog,
        meta: {
            title: 'Device - Audit Log'
        }
    },
    {
        path: 'logs',
        name: 'device-logs',
        component: DeviceLogs,
        meta: {
            title: 'Device - Logs'
        }
    },
    {
        path: 'performance',
        name: 'device-performance',
        component: DevicePerformance,
        meta: {
            title: 'Device - Performance'
        }
    },
    {
        path: 'version-history',
        name: 'device-version-history',
        component: VersionHistory,
        meta: {
            title: 'Device - Version History'
        },
        redirect: to => {
            const features = store.getters['account/featuresCheck']
            const name = features.isTimelineFeatureEnabled ? 'device-version-history-timeline' : 'device-snapshots'
            return {
                name,
                params: to.params
            }
        },
        children: [...VersionHistoryRoutes]
    },
    {
        path: 'developer-mode',
        name: 'device-developer-mode',
        component: DeviceDeveloperMode,
        meta: {
            title: 'Device - Developer Mode'
        }
    }
]

export { children }

export default [
    {
        path: '/device/:id',
        redirect: to => {
            return {
                name: 'device-overview',
                params: to.params
            }
        },
        name: 'Device',
        component: Device,
        meta: {
            title: 'Device - Overview'
        },
        children
    }
]
