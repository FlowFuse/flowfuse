import { describe, expect, test } from 'vitest'

import { sanitizeDiagram, serializeSvg } from '../../../../frontend/src/composables/strings/Mermaid.js'

describe('Mermaid', () => {
    describe('sanitizeDiagram', () => {
        test('removes scripts and event handlers', () => {
            const svg = sanitizeDiagram('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><rect onclick="alert(1)" width="10"></rect></svg>')
            expect(svg).not.toContain('script')
            expect(svg).not.toContain('onclick')
            expect(svg).toContain('<rect width="10">')
        })

        test('removes ids so they do not repeat across diagrams', () => {
            const svg = sanitizeDiagram('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g id="A" class="node"><rect width="10"></rect></g></svg>')
            expect(svg).not.toContain('id=')
            expect(svg).toContain('class="node"')
        })
    })

    describe('serializeSvg', () => {
        test('sets the pixel size from the viewBox', () => {
            const svg = serializeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" style="max-width: 100%"><rect width="10"></rect></svg>')
            expect(svg).toContain('width="120"')
            expect(svg).toContain('height="80"')
            expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
            expect(svg).not.toContain('max-width')
        })

        test('writes the theme variables onto the SVG', () => {
            const svg = serializeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>', { '--pele-bg': '#101010', '--pele-fg': 'rgb(255, 255, 255)' })
            expect(svg).toContain('--pele-bg: #101010')
            expect(svg).toContain('--pele-fg: rgb(255, 255, 255)')
        })
    })
})
