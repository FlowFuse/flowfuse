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
    { path: 'general', name: 'instance-settings-general', component: InstanceSettingsGeneral },
    { path: 'environment', name: 'instance-settings-environment', component: InstanceSettingsEnvVar },
    { path: 'editor', name: 'instance-settings-editor', component: InstanceSettingsEditor },
    { path: 'security', name: 'instance-settings-security', component: InstanceSettingsSecurity },
    { path: 'palette', name: 'instance-settings-palette', component: InstanceSettingsPalette },
    { path: 'danger', name: 'instance-settings-danger', component: InstanceSettingsDanger },
    { path: 'ha', name: 'instance-settings-ha', component: InstanceSettingsHA },
    { path: 'protectInstance', name: 'instance-settings-protect', component: InstanceSettingsProtect },
    {
        path: 'change-type',
        name: 'instance-settings-change-type',
        component: ChangeInstanceTypePage,
        meta: {
            title: 'Instance - Change Type'
        }
    },
    { path: 'alerts', name: 'instance-settings-alerts', component: InstanceSettingsAlerts }
]
