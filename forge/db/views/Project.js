const { KEY_HOSTNAME, KEY_SETTINGS } = require('../models/ProjectSettings')

module.exports = {
    project: async function (app, project) {
        const proj = project.toJSON()
        const result = {
            id: proj.id,
            name: proj.name,
            safeName: proj.safeName || proj.name?.toLowerCase(),
            url: proj.url,
            createdAt: proj.createdAt,
            updatedAt: proj.updatedAt
        }

        // proj.ProjectSettings
        const settingsSettingsRow = proj.ProjectSettings?.find((projectSettingsRow) => projectSettingsRow.key === KEY_SETTINGS)
        if (settingsSettingsRow) {
            result.settings = settingsSettingsRow?.value || {}
            if (result.settings.httpNodeAuth) {
                // Only return whether a password is set or not
                result.settings.httpNodeAuth.pass = !!result.settings.httpNodeAuth.pass
            }
        } else {
            result.settings = {}
        }
        result.settings.env = app.db.controllers.Project.insertPlatformSpecificEnvVars(proj, result.settings.env)
        if (!result.settings.palette?.modules) {
            // If there are no modules listed in settings, check the StorageSettings
            // for the project to see what Node-RED may already think is installed
            result.settings.palette = result.settings.palette || {}
            result.settings.palette.modules = await app.db.controllers.StorageSettings.getProjectModules(project)
        }

        const settingsHostnameRow = proj.ProjectSettings?.find((projectSettingsRow) => projectSettingsRow.key === KEY_HOSTNAME)
        result.hostname = settingsHostnameRow?.value || ''

        if (proj.Team) {
            result.team = {
                id: proj.Team.hashid,
                name: proj.Team.name,
                slug: proj.Team.slug,
                links: proj.Team.links
            }
        }
        if (proj.ProjectType) {
            result.projectType = {
                id: proj.ProjectType.hashid,
                name: proj.ProjectType.name
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
            if (result.template.settings?.httpNodeAuth) {
                // Only return whether a password is set or not
                result.template.settings.httpNodeAuth.pass = !!result.template.settings.httpNodeAuth.pass
            }
        }
        if (proj.ProjectStack) {
            result.stack = {
                id: proj.ProjectStack.hashid,
                name: proj.ProjectStack.name,
                label: proj.ProjectStack.label,
                properties: proj.ProjectStack.properties || {},
                replacedBy: app.db.models.ProjectStack.encodeHashid(proj.ProjectStack.replacedBy) || undefined,
                links: proj.ProjectStack.links
            }
        }
        result.links = proj.links
        return result
    },
    teamProjectList: async function (app, projectList) {
        const result = new Array(projectList.length)
        for (let i = 0; i < projectList.length; i++) {
            const p = projectList[i]
            const r = await app.db.views.Project.project(p)
            // A limitation of how httpAdminRoot is applied to the url property
            // means we can't return the raw url from a projectList that won't
            // include the Template/Settings values with additional db lookups
            delete r.url
            result[i] = r
        }
        return result
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
