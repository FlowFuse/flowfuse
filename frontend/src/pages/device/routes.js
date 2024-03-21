import DeviceAuditLog from './AuditLog.vue'
import DeviceDeveloperMode from './DeveloperMode/index.vue'
import DeviceLogs from './Logs.vue'
import DeviceOverview from './Overview.vue'
import DeviceSettingsDanger from './Settings/Danger.vue'
import DeviceSettingsEnvironment from './Settings/Environment.vue'
import DeviceSettingsGeneral from './Settings/General.vue'
import DeviceSettingsPalette from './Settings/Palette.vue'
import DeviceSettings from './Settings/index.vue'
import DeviceSnapshots from './Snapshots/index.vue'

import Device from './index.vue'

export default [
    {
        path: '/device/:id',
        redirect: to => {
            return `/device/${to.params.id}/overview`
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
                    { path: 'palette', component: DeviceSettingsPalette },
                    { path: 'danger', component: DeviceSettingsDanger }
                ]
            },
            {
                path: 'audit-log',
                component: DeviceAuditLog,
                meta: {
                    title: 'Device - Audit Log'
                }
            },
            {
                path: 'logs',
                component: DeviceLogs,
                meta: {
                    title: 'Device - Logs'
                }
            },
            {
                path: 'snapshots',
                name: 'DeviceSnapshots',
                component: DeviceSnapshots,
                meta: {
                    title: 'Device - Snapshots'
                }
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
