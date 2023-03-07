import ChangeInstanceTypePage from './ChangeInstanceType.vue'
import InstanceSettingsDanger from './Danger.vue'
import InstanceSettingsDevOps from './DevOps.vue'
import InstanceSettingsEditor from './Editor.vue'
import InstanceSettingsEnvVar from './Environment.vue'
import InstanceSettingsGeneral from './General.vue'
import InstanceSettingsPalette from './Palette.vue'
import InstanceSettingsSecurity from './Security.vue'

export default [
    { path: 'general', component: InstanceSettingsGeneral },
    { path: 'environment', component: InstanceSettingsEnvVar },
    { path: 'devops', component: InstanceSettingsDevOps },
    { path: 'editor', component: InstanceSettingsEditor },
    { path: 'security', component: InstanceSettingsSecurity },
    { path: 'palette', component: InstanceSettingsPalette },
    { path: 'danger', component: InstanceSettingsDanger },
    {
        name: 'ChangeInstanceType',
        path: 'change-type',
        component: ChangeInstanceTypePage,
        meta: {
            title: 'Instance - Change Type'
        }
    }
]
