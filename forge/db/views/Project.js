module.exports = {
    project: function (app, project) {
        const proj = project.toJSON()
        const result = {
            id: proj.id,
            name: proj.name,
            url: proj.url,
            createdAt: proj.createdAt,
            updatedAt: proj.updatedAt
        }
        if (proj.ProjectSettings && proj.ProjectSettings.length === 1 && proj.ProjectSettings[0].key === 'settings') {
            result.settings = proj.ProjectSettings[0].value || {}
        } else {
            result.settings = {}
        }
        if (proj.Team) {
            result.team = {
                id: proj.Team.hashid,
                name: proj.Team.name,
                slug: proj.Team.slug,
                links: proj.Team.links
            }
        }
        if (proj.ProjectTemplate) {
            result.template = {
                id: proj.ProjectTemplate.hashid,
                name: proj.ProjectTemplate.name,
                links: proj.ProjectTemplate.links,
                settings: proj.ProjectTemplate.settings,
                policy: proj.ProjectTemplate.policy,
                description: proj.ProjectTemplate.description
            }
        }
        if (proj.ProjectStack) {
            result.stack = {
                id: proj.ProjectStack.hashid,
                name: proj.ProjectStack.name,
                properties: proj.ProjectStack.properties || {},
                links: proj.ProjectStack.links
            }
        }
        result.links = proj.links
        return result
    },
    teamProjectList: function (app, projectList) {
        return projectList.map((t) => {
            const r = app.db.views.Project.project(t)
            // A limitation of how httpAdminRoot is applied to the url property
            // means we can't return the raw url from a projectList that won't
            // include the Template/Settings values with additional db lookups
            delete r.url
            return r
        })
    },
    projectSummary: function (app, project) {
        return {
            id: project.id,
            name: project.name,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            links: project.links
        }
    },
    userProjectList: function (app, projectList) {
        return projectList.map((t) => {
            return {
                id: t.id,
                name: t.name,
                // url: t.url,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                links: t.links,
                team: app.db.views.Team.team(t.Team)
            }
        })
    }
}
