const {
    templateFields,
    passwordTypes,
    defaultTemplateValues,
    defaultTemplatePolicy
} = require('../../../../../forge/lib/templates')

// Functions to map template values to a string for editing
//
// This is used to handle palette_denyList and the like that
// are intended to be stored as arrays of values, but are currently
// edited as a single string (comma-separated list of values)
const templateEncoders = {
    palette_denyList: {
        decode: (v) => {
            // this is reused for the policy object, so let booleans pass through
            if (typeof v === 'boolean') {
                return v
            }
            if (typeof v === 'string') {
                return v
            } else if (Array.isArray(v)) {
                return v.join(', ')
            } else {
                return ''
            }
        },
        encode: (v) => {
            // this is reused for the policy object, so let booleans pass through
            if (typeof v === 'boolean') {
                return v
            }
            return v.split(',')
                .map((fn) => fn.trim())
                .filter((fn) => fn.length > 0)
        }
    },
    modules_denyList: {
        decode: (v) => {
            // this is reused for the policy object, so let booleans pass through
            if (typeof v === 'boolean') {
                return v
            }
            if (typeof v === 'string') {
                return v
            } else if (Array.isArray(v)) {
                return v.join(', ')
            } else {
                return ''
            }
        },
        encode: (v) => {
            // this is reused for the policy object, so let booleans pass through
            if (typeof v === 'boolean') {
                return v
            }
            return v.split(',')
                .map((fn) => fn.trim())
                .filter((fn) => fn.length > 0)
        }
    },
    palette_modules: {
        decode: (v) => {
            return v
        },
        encode: (v) => {
            // Ensure the internal properties are stripped off when writing
            // back value
            if (v) {
                return v.map(field => {
                    return {
                        name: field.name,
                        version: field.version,
                        local: field.local
                    }
                })
            }
            return v
        }
    }

}

const templateValidators = {
    httpAdminRoot: (v) => {
        if (!/^[0-9a-z_\-\\/]*$/i.test(v)) {
            return 'Must contain only 0-9 a-z _ - /'
        }
    },
    dashboardUI: (v) => {
        if (!/^[0-9a-z_\-\\/]*$/i.test(v)) {
            return 'Must contain only 0-9 a-z _ - /'
        }
    },
    palette_nodesExcludes: (v) => {
        if (v.trim() === '') {
            return
        }
        const parts = v
            .split(',')
            .map((fn) => fn.trim())
            .filter((fn) => fn.length > 0)
        for (let i = 0; i < parts.length; i++) {
            const fn = parts[i]
            if (!/^[a-z0-9\-._]+\.js$/i.test(fn)) {
                return 'Must be a comma-separated list of .js filenames'
            }
        }
    },
    palette_denyList: (v) => {
        if (v.trim() === '') {
            return
        }
        const parts = v
            .split(',')
            .map((fn) => fn.trim())
            .filter((fn) => fn.length > 0)
        for (let i = 0; i < parts.length; i++) {
            const fn = parts[i]
            if (!/^((@[a-z0-9-~][a-z0-9-._~]*\/)?([a-z0-9-~][a-z0-9-._~]*|\*))(@([~^><]|<=|>=)?((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?))?$/i.test(fn)) {
                return 'Must be a comma-separated list of nodes[@version]'
            }
        }
    },
    modules_denyList: (v) => {
        if (v.trim() === '') {
            return
        }
        const parts = v
            .split(',')
            .map((fn) => fn.trim())
            .filter((fn) => fn.length > 0)
        for (let i = 0; i < parts.length; i++) {
            const fn = parts[i]
            if (!/^((@[a-z0-9-~][a-z0-9-._~]*\/)?([a-z0-9-~][a-z0-9-._~]*|\*))(@([~^><]|<=|>=)?((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?))?$/i.test(fn)) {
                return 'Must be a comma-separated list of nodes[@version]'
            }
        }
    }
}
function getObjectValue (object, path) {
    const parts = path.split('_')
    let p = object
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
function setObjectValue (object, path, value) {
    const parts = path.split('_')
    let p = object
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
function getTemplateValue (template, path) {
    const p = getObjectValue(template, path)
    if (passwordTypes.includes(path)) {
        // This property is flagged as a password. That means:
        // - if the value is undefined/''/false then it has no value and we return ''
        // - if the value is true or non-empty string, it has a value, but we don't
        //   know the true value. Return '__PASSWD__' as the password placeholder
        return p ? '__PASSWD__' : ''
    } else if (templateEncoders[path]) {
        return templateEncoders[path].decode(p)
    }
    return p
}

function setTemplateValue (template, path, value) {
    let encodedValue = value
    if (passwordTypes.includes(path)) {
        // This property is flagged as a password. That means:
        // - if the value is '__PASSWD__', the value has not been changed so
        //   we set the value to true.
        // - if the value is any other string, the value is being changed so
        //   pass through as-is
        if (value === '__PASSWD__') {
            encodedValue = true
        }
    } else if (templateEncoders[path]) {
        encodedValue = templateEncoders[path].encode(value)
    }

    setObjectValue(template, path, encodedValue)
}

function prepareTemplateForEdit (template) {
    const result = {
        editable: {
            name: '',
            active: false,
            description: '',
            settings: {},
            policy: {},
            changed: {
                name: false,
                description: false,
                settings: {},
                policy: {}
            },
            errors: {}
        },
        original: {
            name: '',
            active: false,
            description: '',
            settings: {},
            policy: {}
        }
    }

    result.editable.name = template.name
    result.original.name = template.name
    result.editable.changed.name = false

    result.editable.active = template.active
    result.original.active = template.active
    result.editable.changed.active = false

    result.editable.description = template.description
    result.original.description = template.description
    result.editable.changed.description = false

    result.editable.errors = {}

    templateFields.forEach((field) => {
        const templateValue = getTemplateValue(template.settings, field)
        if (templateValue !== undefined) {
            if (typeof templateValue === 'object') {
                result.editable.settings[field] = JSON.parse(JSON.stringify(templateValue))
                result.original.settings[field] = JSON.parse(JSON.stringify(templateValue))
            } else {
                result.editable.settings[field] = templateValue
                result.original.settings[field] = templateValue
            }
        } else {
            if (typeof (defaultTemplateValues[field]) === 'object') {
                result.editable.settings[field] = JSON.parse(JSON.stringify(defaultTemplateValues[field]))
                result.original.settings[field] = JSON.parse(JSON.stringify(defaultTemplateValues[field]))
            } else {
                result.editable.settings[field] = defaultTemplateValues[field]
                result.original.settings[field] = defaultTemplateValues[field]
            }
        }
        result.editable.changed.settings[field] = false

        const policyValue = getObjectValue(template.policy, field)
        if (policyValue !== undefined) {
            result.editable.policy[field] = policyValue
            result.original.policy[field] = policyValue
        } else {
            // By default, policy should be to lock values
            result.editable.policy[field] = defaultTemplatePolicy[field]
            result.original.policy[field] = defaultTemplatePolicy[field]
        }
        result.editable.changed.policy[field] = false
    })
    // `template.settings.env` has to be handled separately

    result.editable.settings.env = []
    result.original.settings.envMap = {}
    result.original.settings.env = []
    result.editable.changed.env = false
    if (template.settings.env) {
        template.settings.env.forEach((envVarDefinition, idx) => {
            envVarDefinition.index = idx
            result.editable.settings.env.push(Object.assign({}, envVarDefinition))
            result.original.settings.env.push(Object.assign({}, envVarDefinition))
            result.original.settings.envMap[envVarDefinition.name] = envVarDefinition
        })
    }

    // Migrate old templates to know about httpNodeAuth_type
    if (result.original.settings.httpNodeAuth_type === '') {
        if (result.original.settings.httpNodeAuth_user && result.original.settings.httpNodeAuth_pass) {
            result.original.settings.httpNodeAuth_type = 'basic'
            result.editable.settings.httpNodeAuth_type = 'basic'
        } else {
            result.original.settings.httpNodeAuth_type = 'none'
            result.editable.settings.httpNodeAuth_type = 'none'
        }
    }

    return result
}

/**
 * Parse .env file data into an object
 * NOTES:
 * * SPECIFICATION:
 *   * Simple key/value pairs are supported
 *   * Multiline values are supported
 *   * Single and double quoted values are supported
 *   * Single line comments are skipped
 *   * Leading and trailing whitespace is trimmed if unquoted
 *   * Leading and trailing whitespace is preserved if quoted
 *   * Blank lines are skipped
 *   * Windows and Mac newlines are converted to Unix newlines (opinionated)
 * * UNSUPPORTED: The following features are not supported:
 *   * Variable expansion is not supported
 *   * Escaped quotes are not supported
 *   * Multiline keys are not supported
 *   * Multiline comments are not supported
 * @param {String} data The env file data to parse
 * @returns key/value pairs
 */
function parseDotEnv (data) {
    const result = {}

    // For convenience and simplicity (MVP), force all newlines to be \n
    const newline = '\n'
    data = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    const lines = data.split(newline)
    let currentKey = null
    let currentValue = ''
    let isMultiline = false
    let quoteType = null

    for (const line of lines) {
        // Skip empty lines and comments that are not part of a multiline value
        if (!isMultiline && (!line.trim() || line.trim().startsWith('#'))) {
            continue
        }

        // Handle continuation of multiline value
        if (isMultiline) {
            currentValue += newline + line
            if (line.trim().endsWith(quoteType)) {
                result[currentKey] = currentValue.slice(0, -1)
                currentKey = null
                currentValue = ''
                isMultiline = false
                quoteType = null
            }
            continue
        }

        // Match key/value pair
        const match = line.match(/^([^=:#]+?)[=:](.*)/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim()

            // Detect multiline value start
            const valueMatch = value.match(/^(['"])([\s\S]*)\1$/)
            if (valueMatch) {
                result[key] = valueMatch[2]
            } else {
                if (value.startsWith('"') || value.startsWith("'")) {
                    isMultiline = true
                    quoteType = value[0]
                    currentKey = key
                    currentValue = value.slice(1) // Remove starting quote
                    if (currentValue.endsWith(quoteType)) {
                        result[key] = currentValue.slice(0, -1) // Remove ending quote if it's a single-line quoted value
                        isMultiline = false
                        currentKey = null
                        currentValue = ''
                        quoteType = null
                    }
                } else if (value.endsWith('\\')) {
                    isMultiline = true
                    currentKey = key
                    currentValue = value.slice(0, -1) // Remove trailing backslash
                } else {
                    result[key] = value
                }
            }
        }
    }

    // Handle case where file ends during a multiline value
    if (isMultiline && currentKey) {
        result[currentKey] = currentValue
    }

    return result
}

function isPasswordField (path) {
    return passwordTypes.includes(path)
}

/**
 * @typedef {Object} PaletteModule A palette module object
 * @property {string} name The name of the module (e.g. node-red-contrib-foo)
 * @property {string} version The version of the module (e.g. 1.2.3). Can include semver operators (e.g. >=1.2.3)
 * @property {boolean} [local] Whether the module is local to the project (true) or not (false)
 * @property {string|Number} [index] The index of the module in the original array (e.g. 0, 1, 2, etc)
 *
 * @typedef {Object.<string, PaletteModule>} PaletteModulesMap A map of module names to PaletteModule objects
 */

/**
 * Compare the editable palette modules with the original palette modules to see if there are any changes or errors
 * @param {PaletteModule[]} editableModules The array of modules from the template or instance being edited
 * @param {PaletteModule[] | PaletteModulesMap} originalModules The original modules array or map
 * @returns { changed: boolean, errors: boolean }
 */
function comparePaletteModules (editableModules, originalModules) {
    /** @type {PaletteModulesMap} */
    let originalModulesMap = originalModules
    if (Array.isArray(originalModules)) {
        originalModulesMap = {}
        // generate a map/lookup table
        originalModules.forEach(field => {
            originalModulesMap[field.name] = field
        })
    }
    let changed = false
    let errors = false
    let originalCount = 0
    editableModules.forEach(field => {
        errors = errors || !!field.error
        if (field.index && /^add/.test(field.index + '')) {
            changed = true
        } else {
            originalCount++
            if (originalModulesMap[field.name]) {
                const original = originalModulesMap[field.name]
                if (original.index !== field.index) {
                    changed = true
                } else if (original.name !== field.name) {
                    changed = true
                } else if (original.version !== field.version) {
                    changed = true
                }
            } else {
                changed = true
            }
        }
    })
    if (changed || originalCount !== Object.keys(originalModulesMap).length) {
        changed = true
    }
    return { changed, errors }
}
export {
    isPasswordField,
    getObjectValue,
    setObjectValue,
    getTemplateValue,
    setTemplateValue,
    defaultTemplateValues,
    templateFields,
    templateValidators,
    parseDotEnv,
    prepareTemplateForEdit,
    comparePaletteModules
}
