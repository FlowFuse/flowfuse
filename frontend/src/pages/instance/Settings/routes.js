import ChangeProjectTypePage from './ChangeProjectType.vue'
import ProjectSettingsDanger from './Danger.vue'
import ProjectSettingsDevOps from './DevOps.vue'
import ProjectSettingsEditor from './Editor.vue'
import ProjectSettingsEnvVar from './Environment.vue'
import ProjectSettingsGeneral from './General.vue'
import ProjectSettingsPalette from './Palette.vue'
import ProjectSettingsSecurity from './Security.vue'

export default [
    { path: 'general', component: ProjectSettingsGeneral },
    { path: 'environment', component: ProjectSettingsEnvVar },
    { path: 'devops', component: ProjectSettingsDevOps },
    { path: 'editor', component: ProjectSettingsEditor },
    { path: 'security', component: ProjectSettingsSecurity },
    { path: 'palette', component: ProjectSettingsPalette },
    { path: 'danger', component: ProjectSettingsDanger },
    {
        name: 'ChangeProjectType',
        path: 'danger',
        component: ChangeProjectTypePage,
        meta: {
            title: 'Instance - Change Type'
        }
    }
]
