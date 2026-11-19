/**
 * The changes between two schema documents, as a flat list of JSON Pointer paths.
 * Plain JS with no dependencies, so the API and the frontend share it.
 * Changes are listed, not rated: nothing here says whether a change is breaking.
 */

function isPlainObject (value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function escapePointer (segment) {
    return segment.replace(/~/g, '~0').replace(/\//g, '~1')
}

function isEqual (a, b) {
    if (a === b) {
        return true
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((item, index) => isEqual(item, b[index]))
    }
    if (isPlainObject(a) && isPlainObject(b)) {
        const keys = Object.keys(a)
        return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && isEqual(a[key], b[key]))
    }
    return false
}

function compare (from, to, path, changes) {
    if (isPlainObject(from) && isPlainObject(to)) {
        const keys = [...new Set([...Object.keys(from), ...Object.keys(to)])].sort()
        for (const key of keys) {
            const childPath = `${path}/${escapePointer(key)}`
            if (!Object.hasOwn(to, key)) {
                changes.push({ path: childPath, type: 'deleted', detail: { from: from[key] } })
            } else if (!Object.hasOwn(from, key)) {
                changes.push({ path: childPath, type: 'added', detail: { to: to[key] } })
            } else {
                compare(from[key], to[key], childPath, changes)
            }
        }
        return
    }
    // Arrays (required, enum, prefixItems) and values are compared whole
    if (!isEqual(from, to)) {
        changes.push({ path, type: 'changed', detail: { from, to } })
    }
}

/**
 * @param {*} from the earlier document
 * @param {*} to the later document
 * @returns {{ path: string, type: 'added' | 'changed' | 'deleted', detail: { from?: *, to?: * } }[]}
 *   ordered by path; the top level `$id` is ignored because the platform sets it per version
 */
function diffSchemas (from, to) {
    const changes = []
    if (isPlainObject(from) && isPlainObject(to)) {
        const { $id: fromId, ...fromRest } = from
        const { $id: toId, ...toRest } = to
        compare(fromRest, toRest, '', changes)
    } else {
        compare(from, to, '', changes)
    }
    return changes
}

module.exports = {
    diffSchemas
}
