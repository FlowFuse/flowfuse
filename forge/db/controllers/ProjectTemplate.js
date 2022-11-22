const { hash } = require('../utils')
const { templateFields, defaultTemplateValues, defaultTemplatePolicy } = require('../../lib/templates')

function getTemplateValue (template, path) {
    const parts = path.split('_')
    let p = template
    while (parts.length > 0) {
        const part = parts.shift()
        if (p[part] === undefined) {
            return
        } else {
            p = p[part]
        }
    }
    return p
}

function setTemplateValue (template, path, value) {
    const parts = path.split('_')
    let p = template
    while (parts.length > 1) {
        const part = parts.shift()
        if (p[part] === undefined) {
            p[part] = {}
        }
        p = p[part]
    }
    const lastPart = parts.shift()
    p[lastPart] = value
}

module.exports = {
    /**
   * For a given template, check the project settings are valid. This consists of:
   *  1. ensure the template policy allows the settings to be provided - drop
   *     any that are blocked by policy
   *  2. do any setting-specific validation and cleansing of the value
   * @param {*} app the forge app
   * @param {*} settings the project settings to validate.
   * @param {*} template the template to validate against
   * @returns the validated and cleansed object
   */
    validateSettings: function (app, settings, template) {
        const result = {}
        // First pass - copy over only the known and policy-permitted settings
        templateFields.forEach((name) => {
            const value = getTemplateValue(settings, name)
            if (value !== undefined) {
                let policy = !template || getTemplateValue(template.policy, name)
                if (policy === undefined) { policy = defaultTemplatePolicy[name] }
                if (!template || policy) {
                    setTemplateValue(result, name, value)
                }
            }
        })
        if (settings.env) {
            result.env = []
            const templateEnvPolicyMap = {}
            const templateEnv = template?.settings.env
            if (templateEnv) {
                templateEnv.forEach((envVar) => {
                    templateEnvPolicyMap[envVar.name] = envVar.policy
                })
            }
            settings.env.forEach((envVar) => {
                if (templateEnvPolicyMap[envVar.name] !== false && !/ /.test(envVar.name)) {
                    result.env.push(envVar)
                }
            })
        }

        // Validate individual settings
        if (result.httpAdminRoot !== undefined) {
            let httpAdminRoot = result.httpAdminRoot
            delete result.httpAdminRoot
            if (typeof httpAdminRoot === 'string') {
                httpAdminRoot = httpAdminRoot.trim()
                if (httpAdminRoot.length > 0) {
                    if (httpAdminRoot[0] !== '/') {
                        httpAdminRoot = `/${httpAdminRoot}`
                    }
                    if (httpAdminRoot[httpAdminRoot.length - 1] === '/') {
                        httpAdminRoot = httpAdminRoot.substring(
                            0,
                            httpAdminRoot.length - 1
                        )
                    }
                    if (!/^[0-9a-z_\-\\/]*$/i.test(httpAdminRoot)) {
                        throw new Error('Invalid settings.httpAdminRoot')
                    }
                }
                result.httpAdminRoot = httpAdminRoot
            }
        }
        if (result.dashboardUI !== undefined) {
            let dashboardUI = result.dashboardUI
            delete result.dashboardUI
            if (typeof dashboardUI === 'string') {
                dashboardUI = dashboardUI.trim()
                if (dashboardUI.length > 0) {
                    if (dashboardUI[0] !== '/') {
                        dashboardUI = `/${dashboardUI}`
                    }
                    if (dashboardUI[dashboardUI.length - 1] === '/') {
                        dashboardUI = dashboardUI.substring(
                            0,
                            dashboardUI.length - 1
                        )
                    }
                    if (!/^[0-9a-z_\-\\/]*$/i.test(dashboardUI)) {
                        throw new Error('Invalid settings.dashboardUI')
                    }
                }
                result.dashboardUI = dashboardUI
            }
        }
        if (result.palette?.nodesExcludes !== undefined) {
            const paletteNodeExcludes = result.palette.nodesExcludes
            delete result.palette.nodesExcludes
            if (
                typeof paletteNodeExcludes === 'string' && paletteNodeExcludes.length > 0
            ) {
                const parts = paletteNodeExcludes
                    .split(',')
                    .map((fn) => fn.trim())
                    .filter((fn) => fn.length > 0)
                if (parts.length > 0) {
                    for (let i = 0; i < parts.length; i++) {
                        const fn = parts[i]
                        if (!/^[a-z0-9\-._]+\.js$/i.test(fn)) {
                            throw new Error('Invalid settings.palette.nodesExcludes')
                        }
                    }
                    result.palette.nodesExcludes = parts.join(',')
                }
            }
        }
        if (result.palette?.denyList !== undefined) {
            const paletteDenyList = result.palette.denyList
            delete result.palette.denyList
            if (Array.isArray(paletteDenyList)) {
                if (paletteDenyList.length > 0) {
                    for (let i = 0; i < paletteDenyList.length; i++) {
                        const fn = paletteDenyList[i]
                        if (!/^((@[a-z0-9-~][a-z0-9-._~]*\/)?([a-z0-9-~][a-z0-9-._~]*|\*))(@([~^><]|<=|>=)?((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?))?$/i.test(fn)) {
                            throw new Error('Invalid settings.palette.denyList')
                        }
                    }
                    result.palette.denyList = paletteDenyList
                }
            }
        }
        if (typeof result.httpNodeAuth?.pass === 'string' && result.httpNodeAuth.pass.length > 0) {
            result.httpNodeAuth.pass = hash(result.httpNodeAuth.pass)
        }
        return result
    },

    /**
   * For a given project, merge in the provided settings. This will update
   * settings that have a new value provided, whilst leaving others untouched
   *
   * TODO: This probably doesn't belong in the ProjectTemplate controller
   * as it doesn't do anything with the template itself. However it makes use of
   * templateFields/getTemplateValue/setTemplateValue from this file which
   * aren't otherwise exposed.
   * @param {*} app the forge app
   * @param {*} existingSettings the existing project settings
   * @param {*} settings the new settings to merge in
   */
    mergeSettings: function (app, existingSettings, settings) {
        // Quick deep clone that is safe as we know settings are JSON-safe
        const result = JSON.parse(JSON.stringify(existingSettings))
        templateFields.forEach((name) => {
            const value = getTemplateValue(settings, name)
            if (value !== undefined) {
                setTemplateValue(result, name, value)
            }
        })
        if (settings.env) {
            result.env = settings.env
        }
        return result
    },

    createDefaultTemplate: async function (app, user) {
        const settings = {}
        const policy = {}
        templateFields.forEach((name) => {
            setTemplateValue(settings, name, defaultTemplateValues[name])
            setTemplateValue(policy, name, defaultTemplatePolicy[name])
        })
        const template = await app.db.models.ProjectTemplate.create({
            name: 'Default',
            active: true,
            settings,
            policy
        })
        await template.setOwner(user)
        return template
    }
}
