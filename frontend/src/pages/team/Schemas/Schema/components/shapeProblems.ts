import { type Node, parseTree } from 'jsonc-parser'

import type { ReferenceProblem } from './referenceProblems'

const NOT_AN_OBJECT = 'The schema must be a JSON object'

// Integers written out in full lose digits past 2^53; exponent forms like 1e300 round trip as doubles
function numberProblems (text: string, node: Node | undefined, problems: ReferenceProblem[]) {
    if (!node) return
    if (node.type === 'number') {
        const value = node.value as number
        const literal = text.slice(node.offset, node.offset + node.length)
        if (!Number.isFinite(value)) {
            problems.push({ offset: node.offset, length: node.length, message: 'This number is too large to store' })
        } else if (/^-?\d+$/.test(literal) && !Number.isSafeInteger(value)) {
            problems.push({ offset: node.offset, length: node.length, message: `This number can't be stored exactly, it would be saved as ${value}` })
        }
    }
    node.children?.forEach(child => numberProblems(text, child, problems))
}

/**
 * Problems JSON.parse hides: a root that isn't an object, and numbers that would change when saved.
 * Syntax errors are left to the JSON language service.
 */
export function findShapeProblems (text: string): ReferenceProblem[] {
    if (!text.trim()) return [{ offset: 0, length: 0, message: NOT_AN_OBJECT }]
    try {
        JSON.parse(text)
    } catch {
        return []
    }
    const root = parseTree(text)
    if (root?.type !== 'object') return [{ offset: root?.offset ?? 0, length: root?.length ?? 1, message: NOT_AN_OBJECT }]
    const problems: ReferenceProblem[] = []
    numberProblems(text, root, problems)
    return problems
}
