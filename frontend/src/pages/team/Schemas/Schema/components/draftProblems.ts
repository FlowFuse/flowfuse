import { type Node, parseTree } from 'jsonc-parser'

import type { ReferenceProblem } from './referenceProblems'

function nodeAtPointer (root: Node | undefined, pointer: string): Node | undefined {
    const segments = pointer.split('/').slice(1).map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    let node = root
    for (const [index, segment] of segments.entries()) {
        if (node?.type === 'object') {
            const property = node.children?.find(child => child.children?.[0]?.value === segment)
            node = property?.children?.[index === segments.length - 1 ? 0 : 1]
        } else if (node?.type === 'array') {
            node = node.children?.[Number(segment)]
        } else {
            return undefined
        }
    }
    return node
}

export function locateDraftProblems (text: string, problems: { path: string, message: string }[]): ReferenceProblem[] {
    const root = parseTree(text)
    return problems.map(problem => {
        const node = problem.path ? nodeAtPointer(root, problem.path) : undefined
        return { offset: node?.offset ?? 0, length: node?.length ?? 1, message: problem.message }
    })
}
