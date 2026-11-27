export interface JsonDiffLine {
    type: 'unchanged' | 'added' | 'removed'
    text: string
    oldNum: number | null
    newNum: number | null
}

type Json = unknown

const isContainer = (value: Json): value is Record<string, Json> | Json[] => typeof value === 'object' && value !== null
const size = (value: Record<string, Json> | Json[]) => Array.isArray(value) ? value.length : Object.keys(value).length

// Whether two values print as the same lines
function isEqual (a: Json, b: Json): boolean {
    if (a === b) return true
    if (!isContainer(a) || !isContainer(b) || Array.isArray(a) !== Array.isArray(b)) return false
    if (Array.isArray(a)) return a.length === (b as Json[]).length && a.every((item, index) => isEqual(item, (b as Json[])[index]))
    // in the same order too, as two objects only print the same when their keys are
    const keys = Object.keys(a)
    const otherKeys = Object.keys(b)
    return keys.length === otherKeys.length && keys.every((key, index) => key === otherKeys[index] && isEqual(a[key], (b as Record<string, Json>)[key]))
}

// A value as the lines JSON.stringify prints it over, set in at `indent`, after its key and before the comma that follows it
function render (value: Json, indent: string, key: string, comma: boolean): string[] {
    const lines = JSON.stringify(value, null, 2).split('\n')
    lines[0] = key + lines[0]
    if (comma) lines[lines.length - 1] += ','
    return lines.map(line => indent + line)
}

/**
 * The line by line difference between two JSON values, each printed with two space indentation.
 *
 * It follows the structure instead of comparing text: an object's keys are matched by name and an array's items by position.
 * Read top to bottom, the lines each document has are that document as printed, in its own order.
 * That takes time in proportion to the size of the documents however much of them changed, where a text diff of
 * two documents of thousands of lines that differ a lot takes seconds. It also keeps a key next to its own old value,
 * and does not report a line as changed because a comma was added after it.
 *
 * A line both documents have is given as the newer one prints it.
 */
export function jsonLineDiff (from: Json, to: Json): JsonDiffLine[] {
    const result: JsonDiffLine[] = []
    let oldNum = 1
    let newNum = 1
    const unchanged = (lines: string[]) => lines.forEach(text => result.push({ type: 'unchanged', text, oldNum: oldNum++, newNum: newNum++ }))
    const removed = (lines: string[]) => lines.forEach(text => result.push({ type: 'removed', text, oldNum: oldNum++, newNum: null }))
    const added = (lines: string[]) => lines.forEach(text => result.push({ type: 'added', text, oldNum: null, newNum: newNum++ }))

    // `oldComma` and `newComma` say whether a comma follows the value in each document
    function walk (a: Json, b: Json, indent: string, key: string, oldComma: boolean, newComma: boolean) {
        if (isEqual(a, b)) return unchanged(render(b, indent, key, newComma))
        // Only values that both open a bracket of the same kind, with something in it, are compared inside
        if (!isContainer(a) || !isContainer(b) || Array.isArray(a) !== Array.isArray(b) || !size(a) || !size(b)) {
            removed(render(a, indent, key, oldComma))
            return added(render(b, indent, key, newComma))
        }
        const inner = indent + '  '
        if (Array.isArray(a) && Array.isArray(b)) {
            unchanged([`${indent}${key}[`])
            for (let index = 0; index < Math.max(a.length, b.length); index++) {
                const oldLast = index >= a.length - 1
                const newLast = index >= b.length - 1
                if (index >= b.length) removed(render(a[index], inner, '', !oldLast))
                else if (index >= a.length) added(render(b[index], inner, '', !newLast))
                else walk(a[index], b[index], inner, '', !oldLast, !newLast)
            }
            return unchanged([`${indent}]${newComma ? ',' : ''}`])
        }
        const oldObject = a as Record<string, Json>
        const newObject = b as Record<string, Json>
        const oldKeys = Object.keys(oldObject)
        const newKeys = Object.keys(newObject)
        const label = (name: string) => `${JSON.stringify(name)}: `
        const oldLine = (name: string) => render(oldObject[name], inner, label(name), name !== oldKeys[oldKeys.length - 1])
        unchanged([`${indent}${key}{`])
        // Both documents keep their own order of keys. A key the newer one has further down than the older one did
        // has moved: it shows as removed where it was and as added where it is now.
        const moved = new Set<string>()
        let position = 0
        for (const name of newKeys) {
            const newLast = name === newKeys[newKeys.length - 1]
            if (!Object.hasOwn(oldObject, name) || moved.has(name)) {
                added(render(newObject[name], inner, label(name), !newLast))
                continue
            }
            for (; oldKeys[position] !== name; position++) {
                if (Object.hasOwn(newObject, oldKeys[position])) moved.add(oldKeys[position])
                removed(oldLine(oldKeys[position]))
            }
            position++
            walk(oldObject[name], newObject[name], inner, label(name), name !== oldKeys[oldKeys.length - 1], !newLast)
        }
        for (; position < oldKeys.length; position++) removed(oldLine(oldKeys[position]))
        unchanged([`${indent}}${newComma ? ',' : ''}`])
    }

    walk(from, to, '', '', false, false)
    return result
}
