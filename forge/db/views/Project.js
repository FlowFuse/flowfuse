const { KEY_HOSTNAME, KEY_SETTINGS, KEY_HA, KEY_PROTECTED } = require('../models/ProjectSettings')

module.exports = function (app) {
    app.addSchema({
        $id: 'Instance',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            safeName: { type: 'string' },
            url: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            links: { $ref: 'LinksMeta' },
            hostname: { type: 'string' },
            application: { $ref: 'ApplicationSummary' },
            team: { $ref: 'TeamSummary' },
            projectType: { $ref: 'InstanceTypeSummary' },
            settings: {
                type: 'object',
                additionalProperties: true
            },
            template: {
                type: 'object',
                additionalProperties: true
            },
            stack: { $ref: 'StackSummary' },
            ha: {
                type: 'object',
                additionalProperties: true
            },
            protected: {
                type: 'object',
                additionalProperties: true
            }
        }
    })
    async function project (project, { includeSettings = true } = {}) {
        const proj = project.toJSON()
        const result = {
            id: proj.id,
            name: proj.name,
            safeName: proj.safeName || proj.name?.toLowerCase(),
            url: proj.url,
            createdAt: proj.createdAt,
            updatedAt: proj.updatedAt
        }

        if (includeSettings) {
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
        }
        if (app.config.features.enabled('ha')) {
            const settingsHARow = proj.ProjectSettings?.find(row => row.key === KEY_HA)
            result.ha = settingsHARow?.value || { disabled: true }
        }
        if (app.config.features.enabled('protectedInstance')) {
            const settingsProtectedRow = proj.ProjectSettings?.find(row => row.key === KEY_PROTECTED)
            result.protected = settingsProtectedRow?.value || { enabled: false }
        }

        if (proj.Application) {
            result.application = app.db.views.Application.applicationSummary(proj.Application)
        }
        if (proj.Team) {
            result.team = app.db.views.Team.teamSummary(proj.Team)
        }
        if (proj.ProjectType) {
            result.projectType = app.db.views.ProjectType.projectTypeSummary(proj.ProjectType)
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
            result.stack = app.db.views.ProjectStack.stackSummary(proj.ProjectStack)
        }
        result.links = proj.links
        return result
    }

    // This view is only used by the 'deprecated' /team/:teamId/projects end point.
    // However it is still used in a few places from the frontend. None of them
    // require the full details of the instances - so the settings object can be omitted
    async function instancesList (instancesArray) {
        return Promise.all(instancesArray.map(async (instance) => {
            // Full settings are not required for the instance summary list
            const result = await app.db.views.Project.project(instance, { includeSettings: false })

            if (!result.url) {
                delete result.url
            }

            return result
        }))
    }

    app.addSchema({
        $id: 'InstanceSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            links: { $ref: 'LinksMeta' },
            settings: {
                type: 'object',
                additionalProperties: true
            },
            ha: {
                type: 'object',
                additionalProperties: true
            },
            protected: {
                type: 'object',
                additionalProperties: true
            },
            mostRecentAuditLogCreatedAt: { type: 'string' },
            mostRecentAuditLogEvent: { type: 'string' }
        }
    })
    function projectSummary (project) {
        const result = {
            id: project.id,
            name: project.name,
            url: project.url,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            links: project.links
        }
        if (project.get('mostRecentAuditLogCreatedAt')) {
            result.mostRecentAuditLogCreatedAt = new Date(project.get('mostRecentAuditLogCreatedAt'))
        }
        if (project.get('mostRecentAuditLogEvent')) {
            result.mostRecentAuditLogEvent = project.get('mostRecentAuditLogEvent')
        }
        const settingsSettingsRow = project.ProjectSettings?.find((projectSettingsRow) => projectSettingsRow.key === KEY_SETTINGS)
        if (settingsSettingsRow) {
            if (Object.hasOwn(settingsSettingsRow?.value, 'disableEditor')) {
                result.settings = {
                    disableEditor: settingsSettingsRow.value.disableEditor
                }
            }
        }
        if (app.config.features.enabled('ha')) {
            const settingsHARow = project.ProjectSettings?.find(row => row.key === KEY_HA)
            result.ha = settingsHARow?.value || { disabled: true }
        }
        if (app.config.features.enabled('protectedInstance')) {
            const settingsProtectedRow = project.ProjectSettings?.find(row => row.key === KEY_PROTECTED)
            result.protected = settingsProtectedRow?.value || { enabled: false }
        }
        return result
    }

    app.addSchema({
        $id: 'InstanceSummaryList',
        type: 'array',
        items: {
            $ref: 'InstanceSummary'
        }
    })
    function instancesSummaryList (instancesArray) {
        return instancesArray.map((instance) => {
            const result = projectSummary(instance)
            if (!result.url) {
                delete result.url
            }
            return result
        })
    }

    function userProjectList (projectList) {
        return projectList.map((t) => {
            return {
                id: t.id,
                name: t.name,
                // url: t.url,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                links: t.links,
                application: app.db.views.Application.application(t.Application),
                team: app.db.views.Team.team(t.Team)
            }
        })
    }

    app.addSchema({
        $id: 'InstanceStatus',
        type: 'object',
        properties: {
            flowLastUpdatedAt: { type: 'string' },
            meta: { type: 'object', additionalProperties: true },
            isDeploying: { type: 'boolean' }
        }
    })
    app.addSchema({
        $id: 'InstanceStatusList',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                state: { $ref: 'InstanceStatus' }
            },
            additionalProperties: true
        }
    })
    async function instanceStatusList (instancesArray) {
        return await Promise.all(instancesArray.map(async (instance) => {
            const state = await instance.liveState()
            return { id: instance.id, ...state }
        }))
    }

    return {
        project,
        instancesList,
        instancesSummaryList,
        instanceStatusList,
        projectSummary,
        userProjectList
    }
}
