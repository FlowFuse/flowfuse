
/**
 * WARNING: Instances are currently a naive duplication of projects
 * There is ongoing work to move project functionality not handled by instances up to applications
 */
import ProjectAuditLog from './AuditLog.vue'
import ProjectLogs from './Logs.vue'
import ProjectOverview from './Overview.vue'
import ChangeProjectTypePage from './Settings/ChangeProjectType.vue'
import ProjectSettingsDanger from './Settings/Danger.vue'
import ProjectSettingsDevOps from './Settings/DevOps.vue'
import ProjectSettingsEditor from './Settings/Editor.vue'
import ProjectSettingsEnvVar from './Settings/Environment.vue'
import ProjectSettingsGeneral from './Settings/General.vue'
import ProjectSettingsPalette from './Settings/Palette.vue'
import ProjectSettingsSecurity from './Settings/Security.vue'
import ProjectSettings from './Settings/index.vue'
import ProjectSnapshots from './Snapshots/index.vue'
import Project from './index.vue'

export default [
    {
        path: '/instance/:id',
        redirect: to => {
            return `/instance/${to.params.id}/overview`
        },
        name: 'Instance',
        component: Project,
        meta: {
            title: 'Instance - Overview'
        },
        children: [
            { path: 'overview', component: ProjectOverview },
            {
                path: 'settings',
                component: ProjectSettings,
                meta: {
                    title: 'Instance - Settings'
                },
                redirect: to => {
                    return `/instance/${to.params.id}/settings/general`
                },
                children: [
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
            },
            {
                path: 'logs',
                component: ProjectLogs,
                meta: {
                    title: 'Project - Logs'
                }
            },
            {
                path: 'snapshots',
                component: ProjectSnapshots,
                meta: {
                    title: 'Project - Snapshots'
                }
            },
            {
                path: 'audit-log',
                component: ProjectAuditLog,
                meta: {
                    title: 'Project - Activity'
                }
            }
        ]
    }
]
