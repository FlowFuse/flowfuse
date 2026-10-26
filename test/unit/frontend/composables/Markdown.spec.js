import { describe, expect, test } from 'vitest'

import { highlightCode, useMarkdownHelper } from '../../../../frontend/src/composables/strings/Markdown.js'

describe('useMarkdownHelper', () => {
    const { markedInstance } = useMarkdownHelper()

    test('highlights mermaid fences', () => {
        const html = markedInstance.parse('```mermaid\nflowchart LR\n A[Inject] --> B[Debug]\n```')
        expect(html).toContain('ff-code-block--copy')
        expect(html).toContain('hljs-keyword">flowchart')
        expect(html).toContain('hljs-operator">--&gt;')
    })
})

describe('highlightCode', () => {
    test('keeps line breaks as character references', () => {
        const html = highlightCode('const a = 1\nconst b = 2', 'js')
        expect(html).not.toContain('\n')
        expect(html).toContain('&#10;')
    })
})
