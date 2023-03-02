/**
 * WARNING: Instances are currently a naive duplication of projects
 * There is ongoing work to move project functionality not handled by instances up to applications
 */

import ProjectAuditLog from './AuditLog.vue'
import ProjectLogs from './Logs.vue'
import ProjectOverview from './Overview.vue'
import ProjectSettings from './Settings/index.vue'
import ProjectSettingsRoutes from './Settings/routes'
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
                children: [...ProjectSettingsRoutes]
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
