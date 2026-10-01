// Permissions shape: { platform: { read, write, destructive }, flow_building: { ... } },
// held by an MCP grant as a default plus per-team overrides: { default, teams: { [teamHashid]: ... } }.

const GROUPS = ['platform', 'flow_building']
const CATEGORIES = ['read', 'write', 'destructive']

const TOOL_PERMISSIONS_GROUP_SCHEMA = {
    type: 'object',
    properties: {
        read: { type: 'boolean' },
        write: { type: 'boolean' },
        destructive: { type: 'boolean' }
    }
}
const TOOL_PERMISSIONS_SCHEMA = {
    type: 'object',
    properties: {
        platform: TOOL_PERMISSIONS_GROUP_SCHEMA,
        flow_building: TOOL_PERMISSIONS_GROUP_SCHEMA
    }
}

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

function fromReadOnly (readOnly) {
    const categories = { read: true, write: !readOnly, destructive: false }
    return {
        default: { platform: { ...categories }, flow_building: { ...categories } },
        teams: {}
    }
}

// Builds { default, teams: { [teamHashid]: permissions } } from a stored grant and its team rows
function fromGrant (grant, teamPermissionRows, encodeTeamId) {
    const teams = {}
    for (const row of teamPermissionRows || []) {
        teams[encodeTeamId(row.TeamId)] = row.permissions
    }
    return { default: grant.permissions, teams }
}

function deriveReadOnly (tokenPermissions) {
    return !GROUPS.some(group => anyTeamAllows(tokenPermissions, group, 'write'))
}

// A token's effective readOnly. An MCP token follows its grant, so team removal or deletion needs no
// recalculation; any other token uses its stored flag.
function effectiveReadOnly (token, encodeTeamId) {
    const grant = token.MCPGrant
    if (!grant) {
        return token.readOnly ?? false
    }
    return deriveReadOnly(fromGrant(grant, grant.MCPGrantTeamPermissions, encodeTeamId))
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
    TOOL_PERMISSIONS_GROUP_SCHEMA,
    TOOL_PERMISSIONS_SCHEMA,
    normalise,
    equals,
    fromReadOnly,
    fromGrant,
    deriveReadOnly,
    effectiveReadOnly,
    classOf,
    resolve,
    anyTeamAllows
}
