import Project from "@/pages/project/index.vue"
import ProjectOverview from "@/pages/project/Overview.vue"
import ProjectSettings from "@/pages/project/Settings.vue"
import ProjectDebug from "@/pages/project/Debug.vue"
import ProjectDeploys from "@/pages/project/Deploys.vue"
import ProjectAuditLog from "@/pages/project/AuditLog.vue"
import CreateProject from "@/pages/project/create.vue"

export default [
    {
        path: '/project/:id',
        redirect: to => {
            return `/project/${to.params.id}/overview`
        },
        name: 'Project',
        component: Project,
        children: [
            { path: 'overview', component: ProjectOverview },
            { path: 'settings', component: ProjectSettings },
            { path: 'deploys', component: ProjectDeploys},
            { path: 'audit-log', component: ProjectAuditLog},
            { path: 'debug', component: ProjectDebug }
        ],
    },
    {
        path: '/create',
        name: 'CreateProject',
        component: CreateProject
    }
]
