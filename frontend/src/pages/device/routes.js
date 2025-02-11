// import { useStore } from 'vuex'
import store from '../../store/index.js'

import DeviceAuditLog from './AuditLog.vue'
import DeviceDeveloperMode from './DeveloperMode/index.vue'
import DeviceLogs from './Logs.vue'
import DeviceOverview from './Overview.vue'
import DeviceSettingsDanger from './Settings/Danger.vue'
import DeviceSettingsEditor from './Settings/Editor.vue'
import DeviceSettingsEnvironment from './Settings/Environment.vue'
import DeviceSettingsGeneral from './Settings/General.vue'
import DeviceSettingsPalette from './Settings/Palette.vue'
import DeviceSettings from './Settings/index.vue'
import VersionHistory from './VersionHistory/index.vue'
import VersionHistoryRoutes from './VersionHistory/routes.js'

import Device from './index.vue'

export default [
    {
        path: '/device/:id',
        redirect: to => {
            return { name: 'DeviceOverview', params: to.params }
        },
        name: 'Device',
        component: Device,
        meta: {
            title: 'Device - Overview'
        },
        children: [
            { path: 'overview', component: DeviceOverview, name: 'DeviceOverview' },
            {
                path: 'settings',
                name: 'device-settings',
                component: DeviceSettings,
                meta: {
                    title: 'Device - Settings'
                },
                redirect: to => {
                    return `/device/${to.params.id}/settings/general`
                },
                children: [
                    { path: 'general', component: DeviceSettingsGeneral },
                    { path: 'environment', component: DeviceSettingsEnvironment },
                    { path: 'editor', component: DeviceSettingsEditor },
                    { path: 'palette', component: DeviceSettingsPalette },
                    { path: 'danger', component: DeviceSettingsDanger }
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
                path: 'version-history',
                name: 'DeviceSnapshots',
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
                name: 'DeviceDeveloperMode',
                component: DeviceDeveloperMode,
                meta: {
                    title: 'Device - Developer Mode'
                }
            }
        ]
    }
]
