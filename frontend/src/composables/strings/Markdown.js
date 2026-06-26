import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import { Marked } from 'marked'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', typescript)
hljs.registerLanguage('js', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)

// Inline SVGs are intentional here — the copy button lives inside v-html rendered
// content where Vue components cannot be used.
const ICON_DUPLICATE = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
const ICON_CHECK = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'

export const CODE_BLOCK_ICONS = { ICON_DUPLICATE, ICON_CHECK }

export function useMarkdownHelper () {
    const instance = new Marked({ breaks: true, gfm: true })
    instance.use({
        renderer: {
            code ({ text, lang }) {
                const language = lang ? lang.split(/\s/)[0].toLowerCase() : ''
                let highlighted
                if (language && hljs.getLanguage(language)) {
                    highlighted = hljs.highlight(text, { language }).value
                } else {
                    highlighted = hljs.highlightAuto(text).value
                }
                const langLabel = language ? `<span class="ff-code-block--lang">${language}</span>` : ''
                return `<div class="ff-code-block"><div class="ff-code-block--header"><button class="ff-code-block--copy">${ICON_DUPLICATE}</button>${langLabel}</div><pre><code class="hljs">${highlighted.replace(/\n/g, '&#10;')}</code></pre></div>`
            },
            checkbox ({ checked }) {
                return `<span class="ff-checkbox${checked ? ' ff-checkbox--checked' : ''}">${checked ? '&#x2611;' : '&#x2610;'}</span>`
            },
            list (token) {
                const type = token.ordered ? 'ol' : 'ul'
                const startAttr = (token.ordered && token.start !== 1) ? ` start="${token.start}"` : ''
                const hasTask = token.items.some(i => i.task)
                const cls = hasTask ? ' class="ff-task-list"' : ''
                let body = ''
                for (const item of token.items) {
                    body += this.listitem(item)
                }
                return `<${type}${startAttr}${cls}>\n${body}</${type}>\n`
            },
            table (token) {
                let headerCells = ''
                for (const cell of token.header) {
                    headerCells += this.tablecell(cell)
                }
                const headerRow = this.tablerow({ text: headerCells })
                let body = ''
                for (const row of token.rows) {
                    let rowCells = ''
                    for (const cell of row) {
                        rowCells += this.tablecell(cell)
                    }
                    body += this.tablerow({ text: rowCells })
                }
                if (body) body = `<tbody>${body}</tbody>`
                return `<div class="ff-table-block"><div class="ff-table-block--header"><button class="ff-table-block--copy">${ICON_DUPLICATE}</button></div><table><thead>${headerRow}</thead>${body}</table></div>`
            }
        }
    })

    return { markedInstance: instance }
}
