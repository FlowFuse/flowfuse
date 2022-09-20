import bcrypt from 'bcryptjs'

const templateFields = [
    'disableEditor',
    'disableTours',
    'httpAdminRoot',
    'dashboardUI',
    'codeEditor',
    'theme',
    'page_title',
    'page_favicon',
    'header_title',
    'header_url',
    'timeZone',
    'palette_allowInstall',
    'palette_nodesExcludes',
    'palette_denyList',
    'modules_allowInstall',
    'modules_denyList',
    'httpNodeAuth_user',
    'httpNodeAuth_pass'
]
const defaultTemplateValues = {
    disableEditor: false,
    disableTours: false,
    httpAdminRoot: '',
    dashboardUI: '/ui',
    codeEditor: 'monaco',
    theme: 'forge-light',
    page_title: 'FlowForge',
    page_favicon: '',
    header_title: 'FlowForge',
    header_url: '',
    timeZone: 'UTC',
    palette_allowInstall: true,
    palette_nodesExcludes: '',
    palette_denyList: '',
    modules_allowInstall: true,
    modules_denyList: '',
    httpNodeAuth_user: '',
    httpNodeAuth_pass: ''
}

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
    httpNodeAuth_pass: {
        decode: (v) => {
            if (typeof v === 'boolean') {
                return v
            }
            return '*****'
        },
        encode: (v) => {
            if (typeof v === 'boolean') {
                return v
            }
            // need to bcypt hash input here
            if (v !== '*****') {
                const hash = bcrypt.hashSync(v, 8)
                return hash
            } else {
                return '*****'
            }
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
                return 'Must be a comma-seperated list of nodes[@version]'
            }
        }
    }
}

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
    if (templateEncoders[path]) {
        return templateEncoders[path].decode(p)
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
    if (templateEncoders[path]) {
        p[lastPart] = templateEncoders[path].encode(value)
    } else {
        p[lastPart] = value
    }
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
            result.editable.settings[field] = templateValue
            result.original.settings[field] = templateValue
        } else {
            result.editable.settings[field] = defaultTemplateValues[field]
            result.original.settings[field] = defaultTemplateValues[field]
        }
        result.editable.changed.settings[field] = false

        const policyValue = getTemplateValue(template.policy, field)
        if (policyValue !== undefined) {
            result.editable.policy[field] = policyValue
            result.original.policy[field] = policyValue
        } else {
            // By default, policy should be to lock values
            result.editable.policy[field] = false
            result.original.policy[field] = false
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
    return result
}

export {
    getTemplateValue,
    setTemplateValue,
    defaultTemplateValues,
    templateFields,
    templateValidators,
    prepareTemplateForEdit
}
