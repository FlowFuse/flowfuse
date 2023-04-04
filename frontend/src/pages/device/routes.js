import Device from './index.vue'
import DeviceOverview from './Overview.vue'
import DeviceSettings from './Settings/index.vue'
import DeviceLogs from './Logs.vue'

import DeviceSettingsGeneral from './Settings/General.vue'
import DeviceSettingsEnvironment from './Settings/Environment.vue'
import DeviceSettingsDanger from './Settings/Danger.vue'

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
            { path: 'overview', component: DeviceOverview },
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
                    { path: 'danger', component: DeviceSettingsDanger }
                ]
            },
            {
                path: 'logs',
                component: DeviceLogs,
                meta: {
                    title: 'Device - Logs'
                }
            }
        ]
    }
]
