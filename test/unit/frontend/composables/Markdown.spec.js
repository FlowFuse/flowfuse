import { describe, expect, test } from 'vitest'

import { useMarkdownHelper } from '../../../../frontend/src/composables/strings/Markdown.js'

describe('useMarkdownHelper', () => {
    const { markedInstance } = useMarkdownHelper()

    test('marks mermaid fences so they can be rendered as diagrams', () => {
        const html = markedInstance.parse('```mermaid\nflowchart LR\n A[Inject] --> B[Debug]\n```')
        expect(html).toContain('ff-code-block ff-code-block--mermaid')
        expect(html).toContain('ff-code-block--copy')
        expect(html).toContain('A[Inject] --&gt; B[Debug]')
    })

    test('does not mark other fences as mermaid', () => {
        const html = markedInstance.parse('```js\nconst a = 1\n```')
        expect(html).not.toContain('ff-code-block--mermaid')
    })
})
