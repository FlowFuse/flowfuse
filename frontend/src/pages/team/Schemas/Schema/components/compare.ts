// Keywords whose value is a schema, so the segment after them is a schema keyword again
const SCHEMA_KEYWORDS = new Set(['items', 'additionalProperties', 'contains', 'not', 'if', 'then', 'else', 'propertyNames'])

const unescape = (segment: string) => segment.replace(/~1/g, '/').replace(/~0/g, '~')

/**
 * A change's JSON Pointer as a path through the fields, the way the message looks:
 * `/properties/sensor/properties/id/pattern` reads `/sensor/id/pattern`.
 * Only a `properties` that is a keyword is left out, so a field named `properties` keeps its name.
 */
export function fieldPath (pointer: string): string {
    const segments = pointer.split('/').slice(1).map(unescape)
    const path: string[] = []
    let atKeyword = true
    for (let index = 0; index < segments.length; index++) {
        const segment = segments[index]
        if (atKeyword && segment === 'properties' && index + 1 < segments.length) {
            path.push(segments[++index])
        } else {
            path.push(segment)
            atKeyword = atKeyword && SCHEMA_KEYWORDS.has(segment)
        }
    }
    return `/${path.join('/')}`
}

// A value of a change on one line, as a pill shows it
export function formatValue (value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value)
}

// The document as the JSON diff shows it. The top level $id differs for every version, so it is left out
export function diffText (document: Record<string, unknown>): string {
    const rest = { ...document }
    delete rest.$id
    return JSON.stringify(rest, null, 2)
}

export interface VersionEntry { version: string | null, status: string }

/**
 * The versions to compare when none were picked: from the version asked for (or the latest published),
 * to the draft when there is one and otherwise the latest published.
 * When that would compare a version with itself, it is compared with the one before it.
 * `versions` is newest first with the draft on top, as the schema lists them.
 */
export function defaultPair (versions: VersionEntry[], from?: string, to?: string): { from: string, to: string } | null {
    const keys = versions.map(entry => entry.status === 'draft' ? 'draft' : entry.version as string)
    if (keys.length < 2) return null
    const pickedTo = to && keys.includes(to) ? to : keys[0]
    let pickedFrom = from && keys.includes(from) ? from : keys.find(key => key !== 'draft')!
    if (pickedFrom === pickedTo) {
        pickedFrom = keys[keys.indexOf(pickedTo) + 1] ?? keys[keys.indexOf(pickedTo) - 1]
    }
    return { from: pickedFrom, to: pickedTo }
}
