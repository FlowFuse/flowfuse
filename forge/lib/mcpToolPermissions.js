// Permissions shape: { platform: { read, write, destructive }, flow_building: { ... } },
// stored as a token default plus per-team overrides: { default, teams: { [teamHashid]: ... } }.

const GROUPS = ['platform', 'flow_building']
const CATEGORIES = ['read', 'write', 'destructive']

function normaliseCategories (categories) {
    const source = categories || {}
    const destructive = !!source.destructive
    const write = !!source.write || destructive
    const read = !!source.read || write
    return { read, write, destructive }
}

function normalise (permissions) {
    const source = permissions || {}
    const result = {}
    for (const group of GROUPS) {
        result[group] = normaliseCategories(source[group])
    }
    return result
}

function equals (a, b) {
    if (!a || !b) {
        return a === b
    }
    return GROUPS.every(group => CATEGORIES.every(category => !!a[group]?.[category] === !!b[group]?.[category]))
}

function legacyDefault (readOnly) {
    const categories = { read: true, write: !readOnly, destructive: false }
    return { platform: { ...categories }, flow_building: { ...categories } }
}

function deriveReadOnly (tokenPermissions) {
    return !GROUPS.some(group => anyTeamAllows(tokenPermissions, group, 'write'))
}

function classOf (annotations) {
    if (annotations?.readOnlyHint === true) {
        return 'read'
    }
    if (annotations?.destructiveHint === true) {
        return 'destructive'
    }
    return 'write'
}

function resolve (tokenPermissions, teamHashid, group, category) {
    if (!tokenPermissions) {
        return false
    }
    const override = teamHashid ? tokenPermissions.teams?.[teamHashid] : null
    const categories = override ? override[group] : tokenPermissions.default?.[group]
    return !!categories?.[category]
}

function anyTeamAllows (tokenPermissions, group, category) {
    if (!tokenPermissions) {
        return false
    }
    if (tokenPermissions.default?.[group]?.[category]) {
        return true
    }
    const teams = tokenPermissions.teams || {}
    return Object.values(teams).some(teamPermissions => !!teamPermissions?.[group]?.[category])
}

module.exports = {
    GROUPS,
    CATEGORIES,
    normalise,
    equals,
    legacyDefault,
    deriveReadOnly,
    classOf,
    resolve,
    anyTeamAllows
}
