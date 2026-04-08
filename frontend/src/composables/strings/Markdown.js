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
            return `<div class="ff-code-block"><div class="ff-code-block--header">${langLabel}<button class="ff-code-block--copy">Copy</button></div><pre><code class="hljs">${highlighted}</code></pre></div>`
        }
    }
})

export const markedInstance = instance
