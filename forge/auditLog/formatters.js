const { RoleNames } = require('../lib/roles')

const isObject = (obj) => {
    return obj !== null && typeof obj === 'object'
}

/**
 * Generate a standard format body for the audit log display and database.
 * Any items null or missing must not generate a property in the body
 * @param {{ error?, team?, project?, sourceProject?, device?, user?, stack?, billingSession?, subscription?, license?, updates?, snapshot?, role?, projectType? } == {}} objects objects to include in body
 * @returns {{ error?, team?, project?, sourceProject?, device?, user?, stack?, billingSession?, subscription?, license?, updates?, snapshot?, role?, projectType? }
 */
const generateBody = ({ error, team, project, sourceProject, device, user, stack, billingSession, subscription, license, updates, snapshot, role, projectType } = {}) => {
    const body = {}

    if (isObject(error) || typeof error === 'string') {
        body.error = errorObject(error)
    }
    if (isObject(team)) {
        body.team = teamObject(team)
    }
    if (isObject(project)) {
        body.project = projectObject(project)
    }
    if (isObject(sourceProject)) {
        body.sourceProject = projectObject(sourceProject)
    }
    if (isObject(device)) {
        body.device = deviceObject(device)
    }
    if (isObject(user)) {
        body.user = userObject(user)
    }
    if (isObject(stack)) {
        body.stack = stackObject(stack)
    }
    if (isObject(billingSession)) {
        body.billingSession = billingSessionObject(billingSession)
    }
    if (isObject(subscription)) {
        body.subscription = subscriptionObject(subscription)
    }
    if (typeof license === 'string') {
        body.license = license
    }
    if (updates && updates instanceof UpdatesCollection && updates.length > 0) {
        body.updates = updates.toArray()
    } else if (updates && Array.isArray(updates) && updates.length > 0) {
        body.updates = [...updates]
    }
    if (isObject(snapshot)) {
        body.snapshot = snapshotObject(snapshot)
    }
    if (isObject(role) || typeof role === 'number') {
        body.role = roleObject(role)
    }
    if (isObject(projectType)) {
        body.projectType = projectTypeObject(projectType)
    }
    return body
}

const sanitiseObjectIds = (obj) => {
    if (obj && obj.hashid !== undefined) {
        if (obj.hashid) {
            obj.id = obj.hashid
        }
        delete obj.hashid
    }
    return obj
}

const formatLogEntry = (auditLogDbRow) => {
    // Format an audit log DB row to specification described in #1183
    const formatted = {
        hashid: auditLogDbRow.hashid, // Required for pagination / table key
        User: auditLogDbRow.User, // TODO: Kept for compatibility. Remove once Audit Log UI overhaul complete
        event: auditLogDbRow.event,
        createdAt: auditLogDbRow.createdAt,
        scope: {
            id: auditLogDbRow.entityId,
            type: auditLogDbRow.entityType
        },
        trigger: triggerObject(auditLogDbRow.UserId, auditLogDbRow.User)
    }
    if (auditLogDbRow.body) {
        let body
        try {
            if (auditLogDbRow.body) {
                body = auditLogDbRow.body
                if (typeof body !== 'object') {
                    body = JSON.parse(body)
                }
            }

            // if the User is null, see if the body has details of who triggered the event
            if (!formatted.User && auditLogDbRow.UserId == null && body?.trigger?.id != null) {
                formatted.trigger = triggerObject(body.trigger.id, body.trigger)
                formatted.User = { username: formatted.trigger.name } // TODO: Kept for compatibility. Remove once Audit Log UI overhaul complete
            }

            formatted.body = generateBody({
                error: body?.error,
                team: body?.team,
                project: body?.project,
                sourceProject: body?.sourceProject,
                user: body?.user,
                stack: body?.stack,
                billingSession: body?.billingSession,
                subscription: body?.subscription,
                license: body?.license,
                snapshot: body?.snapshot,
                updates: body?.updates,
                device: body?.device,
                projectType: body?.projectType
            })
            const roleObj = body?.role && roleObject(body.role)
            if (roleObj) {
                if (formatted.body?.user) {
                    formatted.body.user.role = roleObj.role
                } else {
                    formatted.body.role = roleObj
                }
            }
            // For compatibility. Grab error in old style log entry for correct display
            if (body?.code && body?.error) {
                formatted.body.error = errorObject({ code: body.code, error: body.error })
            }
            for (const [key, value] of Object.entries(formatted.body)) {
                formatted.body[key] = sanitiseObjectIds(value)
            }
        } catch (_err) {
            // console.log('Error parsing audit log body', _err)
        }
    }
    return formatted
}

// #region Log entry formatters
const errorObject = (error) => {
    if (!error) { return null }
    let err = error
    if (typeof error !== 'object') {
        err = { error }
    }
    const errObject = {
        code: err.code || 'unexpected_error',
        message: err.error || err.message || 'unexpected error'
    }
    if (err instanceof Error) {
        errObject.stack = err.stack
    }
    return errObject
}
const teamObject = (team, unknownValue = null) => {
    return {
        id: team?.id || null,
        hashid: team?.hashid || null,
        name: team?.name || unknownValue,
        slug: team?.slug || unknownValue,
        type: team?.type || unknownValue
    }
}
const userObject = (user, unknownValue = null) => {
    const result = triggerObject(user?.id, user) || {}
    // the user object had 2 additional fields that are not in the trigger object
    result.username = result.username || user?.username || unknownValue
    result.email = result.email || user?.email || unknownValue
    return result
}
const projectObject = (project, unknownValue = null) => {
    return {
        id: project?.id || null,
        hashid: project?.hashid || null,
        name: project?.name || unknownValue
    }
}
const deviceObject = (device, unknownValue = null) => {
    return {
        id: device?.id || null,
        hashid: device?.hashid || null,
        name: device?.name || unknownValue
    }
}
const stackObject = (stack, unknownValue = null) => {
    return {
        id: stack?.id || null,
        hashid: stack?.hashid || null,
        name: stack?.name || unknownValue
    }
}
const billingSessionObject = (session) => {
    return {
        id: session?.id || null
    }
}
const subscriptionObject = (subscription) => {
    return {
        subscription: subscription?.subscription || null
    }
}
const snapshotObject = (snapshot) => {
    return {
        id: snapshot?.id || null,
        hashid: snapshot?.hashid || null,
        name: snapshot?.name || null
    }
}
const roleObject = (role) => {
    if (typeof role === 'number') {
        if (RoleNames[role]) {
            role = RoleNames[role]
        } else {
            role = `Unknown Role: ${role}`
        }
        return { role }
    } else if (typeof role === 'string') {
        return { role }
    }
    return role
}
const projectTypeObject = (projectType) => {
    return {
        id: projectType?.id || null,
        hashid: projectType?.hashid || null,
        name: projectType?.name || null
    }
}
/**
 * Generates the `trigger` part of the audit log report
 * @param {object|number|'system'} actionedBy A user object or a user id. NOTE: 0 or 'system' can be used to indicate "system" triggered the event
 * @param {*} [user] If `actionedBy` is an ID, passing a the user object will permit the username to be rendered
 * @returns {{ id:number, type:string, name:string }} { id, type, name }
 */
const triggerObject = (actionedBy, user) => {
    const sanitise = (actionedBy, user) => {
        let id = null
        let hashid = null
        let type = user != null ? 'user' : 'unknown'
        let name = user?.username || user?.email || user?.name || 'Unknown'
        if (typeof actionedBy === 'string') {
            if (actionedBy === 'system') {
                id = 0
                type = 'system'
                name = 'Forge Platform'
            } else {
                id = actionedBy
                hashid = actionedBy
                type = 'user'
            }
        } else if (typeof actionedBy === 'number') {
            id = actionedBy
            if (id === 0) {
                type = 'system'
                name = 'Forge Platform'
            } else if (id > 0) {
                type = 'user'
                if (user) {
                    hashid = user.hashid || null
                }
            }
        } else if (typeof actionedBy === 'object' && actionedBy != null) {
            return sanitise(actionedBy.id, actionedBy)
        }
        return { id, hashid, type, name }
    }
    return sanitise(actionedBy, user)
}
// #endregion (Log entry formatters)

// #region Updates formatter

/**
 * Creates and `updateObject` for pushing to an `UpdatesCollection`
 * @returns {updateObject}
 */
const DIFF_TYPES = {
    VALUE_CREATED: 'created',
    VALUE_UPDATED: 'updated',
    VALUE_DELETED: 'deleted',
    VALUE_UNCHANGED: '---'
}
const updatesObject = (key, oldValue, newValue, diffKind = DIFF_TYPES.VALUE_UPDATED) => {
    // check if valid type
    if (Object.values(DIFF_TYPES).includes(diffKind)) {
        return { key, old: oldValue, new: newValue, dif: diffKind }
    } else {
        const err = Error(`${diffKind} is not a valid value of diffKind`)
        err.code = 'invalid_value'
        throw err
    }
}

class UpdatesCollection {
    constructor () {
        this.updates = []
    }

    get length () {
        return this.updates.length
    }

    toArray () {
        return [...this.updates]
    }

    pushDifferences (oldObject, newObject, sensitiveKeys = ['pass', 'password', 'token', 'secret', 'credentials', 'credentialSecret', 'cookieSecret']) {
        this.updates.push(...generateUpdates(oldObject, newObject, sensitiveKeys) || [])
    }
    /**
     * A update object
     * @typedef {{ key: string, old: any, new: any }} updateObject
     */

    /**
     * Record a property update
     * @param {string|updateObject} key The property name (alternatively, this can be an `updateObject` )
     * @param {*} oldValue The old value
     * @param {*} newValue The new value
     * @param {'updated'|'created'|'deleted'} diffKind The new value
     */
    push (key, oldValue, newValue, diffKind = 'updated') {
        if (typeof key === 'object') {
            this.updates.push(key)
        } else {
            this.updates.push(updatesObject(key, oldValue, newValue, diffKind))
        }
    }
}
function generateUpdates (o1, o2, sensitiveKeys) {
    sensitiveKeys = sensitiveKeys || []
    const deepDiffMapper = (() => {
        return {
            ...DIFF_TYPES,
            map: function (obj1, obj2) {
                if (this.isFunction(obj1) || this.isFunction(obj2)) {
                    throw new Error('Invalid argument. Function given, object expected.')
                }
                if (this.isValue(obj1) || this.isValue(obj2)) {
                    const returnObj = {
                        dif: this.compareValues(obj1, obj2),
                        old: obj1,
                        new: obj2
                    }
                    if (returnObj.dif !== this.VALUE_UNCHANGED) {
                        return returnObj
                    }
                    return undefined
                }

                const diff = {}
                const foundKeys = {}
                for (const key in obj1) {
                    if (this.isFunction(obj1[key])) {
                        continue
                    }

                    let value2
                    if (obj2[key] !== undefined) {
                        value2 = obj2[key]
                    }

                    const mapValue = this.map(obj1[key], value2)
                    foundKeys[key] = true
                    if (mapValue) {
                        diff[key] = mapValue
                    }
                }
                for (const key in obj2) {
                    if (this.isFunction(obj2[key]) || foundKeys[key] !== undefined) {
                        continue
                    }
                    const mapValue = this.map(undefined, obj2[key])
                    if (mapValue) {
                        diff[key] = mapValue
                    }
                }
                if (Object.keys(diff).length > 0) {
                    return diff
                }
                return undefined
            },
            compareValues: function (value1, value2) {
                if (value1 === value2) {
                    return this.VALUE_UNCHANGED
                }
                if (this.isDate(value1) && this.isDate(value2) && value1.getTime() === value2.getTime()) {
                    return this.VALUE_UNCHANGED
                }
                if (value1 === undefined) {
                    return this.VALUE_CREATED
                }
                if (value2 === undefined) {
                    return this.VALUE_DELETED
                }
                return this.VALUE_UPDATED
            },
            isFunction: function (x) {
                return Object.prototype.toString.call(x) === '[object Function]'
            },
            isArray: function (x) {
                return Object.prototype.toString.call(x) === '[object Array]'
            },
            isDate: function (x) {
                return Object.prototype.toString.call(x) === '[object Date]'
            },
            isObject: function (x) {
                return Object.prototype.toString.call(x) === '[object Object]'
            },
            isValue: function (x) {
                return !this.isObject(x) && !this.isArray(x)
            }
        }
    })()
    const isInt = (value) => {
        return !isNaN(value) &&
               parseInt(Number(value)) == value && // eslint-disable-line eqeqeq
               !isNaN(parseInt(value, 10))
    }
    const toFlatPropertyMap = (obj, keySeparator = '.') => {
        const flattenRecursive = (obj, parentProperty, propertyMap = {}) => {
            // TODO: Consider converting array of KV to object for better diffing and reporting
            for (const [key, value] of Object.entries(obj)) {
                let property
                if (isInt(key)) {
                    property = parentProperty ? `${parentProperty}[${key}]` : key
                } else {
                    property = parentProperty ? `${parentProperty}${keySeparator}${key}` : key
                }
                if (deepDiffMapper.isDate(value)) {
                    propertyMap[property] = value
                } else if (value && typeof value === 'object') {
                    flattenRecursive(value, property, propertyMap)
                } else if (value && typeof value === 'function') {
                    // ignore functions
                } else {
                    propertyMap[property] = value
                }
            }
            return propertyMap
        }
        return flattenRecursive(obj)
    }
    const diffToArray = (diff) => {
        return Object.entries(diff || {}).map(([key, val]) => { return updatesObject(key, val.old, val.new, val.dif) })
    }
    const flat1 = toFlatPropertyMap(o1)
    const flat2 = toFlatPropertyMap(o2)
    const diff = deepDiffMapper.map(flat1, flat2)
    const diffSansSensitive = diffToArray(diff).map((update) => {
        const sensitive = sensitiveKeys.some(s => (update.key).endsWith(s))
        if (sensitive) {
            update.old = '***'
            update.new = '***'
        }
        return update
    })
    return diffSansSensitive
}
// #endregion (Updates formatter)

module.exports = {
    errorObject,
    teamObject,
    projectObject,
    deviceObject,
    userObject,
    stackObject,
    billingSessionObject,
    snapshotObject,
    roleObject,
    projectTypeObject,
    triggerObject,
    updatesObject,
    UpdatesCollection,
    generateUpdates,
    generateBody,
    formatLogEntry
}
