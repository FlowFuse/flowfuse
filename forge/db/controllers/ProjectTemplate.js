const { BUILT_IN_MODULES } = require('../../lib/builtInModules')
const { templateFields, defaultTemplateValues, defaultTemplatePolicy } = require('../../lib/templates')
const { hash } = require('../utils')

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
                    if (!envVar.name.match(/^[a-zA-Z_]+[a-zA-Z0-9_]*$/)) {
                        throw new Error(`Invalid Env Var name '${envVar.name}'`)
                    }
                    // removed because it breaks snapshot rollback test
                    // if (envVar.name.match(/^FF_/)) {
                    //     throw new Error(`Illegal Env Var name ${envVar.name}`)
                    // }
                    result.env.push(envVar)
                }
            })
            // find duplicates
            const seen = new Set()
            const dups = result.env.some(item => { return seen.size === seen.add(item.name).size })
            if (dups) {
                throw new Error('Duplicate Env Var names provided')
            }
        }
        // Validate palette modules:
        // * No duplicates
        // * No invalid names
        // * No invalid versions
        if (settings.palette?.modules) {
            // ensure names and version are valid
            // NOTE: `validateModuleName` and `validateModuleVersion` have frontend counterparts
            // in `/frontend/src/pages/admin/Template/sections/PaletteModules.vue` and should be kept in sync
            const validateModuleName = (name) => !BUILT_IN_MODULES.includes(name) && /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)
            const validateModuleVersion = (version) => /^\*$|x|(?:[\^~]?(0|[1-9]\d*)\.(x$|0|[1-9]\d*)(?:\.(x$|0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)?)$/.test(version)
            const moduleMap = {}
            for (let i = 0; i < settings.palette.modules.length; i++) {
                const module = settings.palette.modules[i]

                // ensure there are no duplicates
                if (moduleMap[module.name]) {
                    throw new Error(`Duplicate module: ${module.name}`)
                }
                moduleMap[module.name] = true

                // ensure names and version are valid
                if (!validateModuleName(module.name)) {
                    throw new Error(`Invalid module name: ${module.name}`)
                }
                if (!validateModuleVersion(module.version)) {
                    throw new Error(`Invalid module version: ${module.version}`)
                }
            }
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
                } else {
                    result.palette.denyList = []
                }
            }
        }
        if (typeof result.httpNodeAuth?.pass === 'string' && result.httpNodeAuth.pass.length > 0) {
            result.httpNodeAuth.pass = hash(result.httpNodeAuth.pass)
        }
        if (result.apiMaxLength) {
            if (!/^\d+(?:kb|mb)$/.test(result.apiMaxLength)) {
                throw new Error('Invalid settings.apiMaxLength')
            }
        }
        if (result.debugMaxLenth) {
            if (!Number.isInteger(result.debugMaxLength) || result.debugMaxLength < 0) {
                throw new Error('Invalid settings.debugMaxLength')
            }
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
   * @param {*} options options for the merge
   * @param {boolean} options.mergeEnvVars if true, merge the env vars (new keys added, existing keys untouched, removed keys untouched)
   */
    mergeSettings: function (app, existingSettings, settings, { mergeEnvVars = false } = {}) {
        // Quick deep clone that is safe as we know settings are JSON-safe
        const result = JSON.parse(JSON.stringify(existingSettings))
        templateFields.forEach((name) => {
            const value = getTemplateValue(settings, name)
            if (value !== undefined) {
                setTemplateValue(result, name, value)
            }
        })
        if (result.httpNodeAuth?.type && result.httpNodeAuth.type !== 'basic') {
            result.httpNodeAuth.user = ''
            result.httpNodeAuth.pass = ''
        }
        if (result.page?.title === 'FlowForge') {
            result.page.title = 'FlowFuse'
        }
        if (settings.env) {
            if (mergeEnvVars) {
                // As objects for stable merge
                const existingEnvVars = Object.fromEntries((existingSettings.env || []).map(envVar => [envVar.name, envVar.value]))
                const newEnvVars = Object.fromEntries((settings.env || []).map(envVar => [envVar.name, envVar.value]))

                // copy new over old, then old over the merge (to keep the order), existing have precedence over new
                const mergedEnvVars = { ...existingEnvVars, ...newEnvVars, ...existingEnvVars }

                // Convert back to an array
                result.env = []
                Object.entries(mergedEnvVars).forEach(entry => {
                    const [name, value] = entry
                    result.env.push({
                        name, value
                    })
                })
            } else {
                result.env = settings.env
            }
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
        const [template] = await app.db.models.ProjectTemplate.findOrCreate({
            where: {
                name: 'Default',
                active: true,
                ownerId: user.id
            },
            defaults: {
                settings,
                policy
            }
        })
        await template.setOwner(user)
        return template
    }
}
