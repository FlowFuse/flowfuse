import { type Node, parseTree } from 'jsonc-parser'

export interface ReferenceProblem {
    offset: number
    length: number
    message: string
}

// @TODO-SCHEMAS: THESE LISTS MIRROR forge/ee/lib/schemas/document.js (#9225); ALSO SHOW THE DRAFT RESPONSE'S problems[].path (JSON POINTER) AS MARKERS VIA jsonc-parser findNodeAtLocation
const REFERENCE_KEYWORDS = ['$ref', '$dynamicRef', '$recursiveRef', '$defs', 'definitions', '$anchor', '$dynamicAnchor', '$recursiveAnchor', '$id']
const SUBSCHEMA_KEYWORDS = ['additionalProperties', 'propertyNames', 'items', 'contains', 'not', 'if', 'then', 'else', 'unevaluatedItems', 'unevaluatedProperties', 'contentSchema']
const SUBSCHEMA_LIST_KEYWORDS = ['allOf', 'anyOf', 'oneOf', 'prefixItems']
const SUBSCHEMA_MAP_KEYWORDS = ['properties', 'patternProperties', 'dependentSchemas']

function walk (schema: Node | undefined, isRoot: boolean, problems: ReferenceProblem[]) {
    if (schema?.type !== 'object') return
    for (const property of schema.children ?? []) {
        const [keyNode, valueNode] = property.children ?? []
        const keyword = keyNode?.value
        if (isRoot && keyword === '$id') continue
        if (REFERENCE_KEYWORDS.includes(keyword)) {
            problems.push({ offset: keyNode.offset, length: keyNode.length, message: `${keyword} is not supported yet` })
        }
        if (SUBSCHEMA_KEYWORDS.includes(keyword)) {
            walk(valueNode, false, problems)
        } else if (SUBSCHEMA_LIST_KEYWORDS.includes(keyword) && valueNode?.type === 'array') {
            valueNode.children?.forEach(child => walk(child, false, problems))
        } else if (SUBSCHEMA_MAP_KEYWORDS.includes(keyword) && valueNode?.type === 'object') {
            valueNode.children?.forEach(entry => walk(entry.children?.[1], false, problems))
        }
    }
}

export function findReferenceProblems (text: string): ReferenceProblem[] {
    const problems: ReferenceProblem[] = []
    walk(parseTree(text), true, problems)
    return problems
}
