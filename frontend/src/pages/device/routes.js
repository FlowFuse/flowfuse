import Device from '@/pages/device/index.vue'
import DeviceOverview from '@/pages/device/Overview.vue'
import DeviceSettings from '@/pages/device/Settings/index.vue'

import DeviceSettingsGeneral from '@/pages/device/Settings/General.vue'
import DeviceSettingsEnvironment from '@/pages/device/Settings/Environment.vue'
import DeviceSettingsDanger from '@/pages/device/Settings/Danger.vue'

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
            }
        ]
    }
]
