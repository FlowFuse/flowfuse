import InstanceSettingsAlerts from './Alerts.vue'
import ChangeInstanceTypePage from './ChangeInstanceType.vue'
import InstanceSettingsDanger from './Danger.vue'
import InstanceSettingsEditor from './Editor.vue'
import InstanceSettingsEnvVar from './Environment.vue'
import InstanceSettingsGeneral from './General.vue'
import InstanceSettingsHA from './HighAvailability.vue'
import InstanceSettingsPalette from './Palette.vue'
import InstanceSettingsProtect from './ProtectInstance.vue'
import InstanceSettingsSecurity from './Security.vue'

export default [
    { path: 'general', component: InstanceSettingsGeneral },
    { path: 'environment', component: InstanceSettingsEnvVar },
    { path: 'editor', component: InstanceSettingsEditor },
    { name: 'InstanceSettingsSecurity', path: 'security', component: InstanceSettingsSecurity },
    { path: 'palette', component: InstanceSettingsPalette },
    { path: 'danger', component: InstanceSettingsDanger },
    { path: 'ha', name: 'InstanceSettingsHA', component: InstanceSettingsHA },
    { path: 'protectInstance', name: 'InstanceSettingsProtect', component: InstanceSettingsProtect },
    {
        name: 'ChangeInstanceType',
        path: 'change-type',
        component: ChangeInstanceTypePage,
        meta: {
            title: 'Instance - Change Type'
        }
    },
    { path: 'alerts', component: InstanceSettingsAlerts }
]
