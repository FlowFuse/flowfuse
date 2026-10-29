import DOMPurify from 'dompurify'

// The diagram types the Expert renders, by the language of their code block
export const DIAGRAM_TYPES = ['mermaid']

// The CSS variables the rendered diagrams take their colours from
export const THEME_VARIABLES = [
    '--pele-bg',
    '--pele-fg',
    '--pele-muted',
    '--pele-line',
    '--pele-surface',
    '--pele-surface-alt',
    '--pele-border',
    '--pele-accent'
]

// The SVG is rendered by the Expert and arrives with the message, so it is untrusted markup.
// Ids are dropped because nothing in the SVG refers to them and they repeat across the diagrams on a page.
export function sanitizeDiagram (svg) {
    return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_ATTR: ['id'] })
}

function parseSvg (svg) {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    return doc.documentElement
}

// Returns the diagram as standalone SVG markup with explicit pixel dimensions. The theme
// variables are written onto the SVG, as outside the page it no longer inherits them.
export function serializeSvg (svg, theme = {}) {
    const el = parseSvg(svg)
    const [, , width, height] = (el.getAttribute('viewBox') || '').split(/\s+/).map(Number)
    if (width && height) {
        el.setAttribute('width', width)
        el.setAttribute('height', height)
    }
    el.style.maxWidth = ''
    for (const [name, value] of Object.entries(theme)) {
        el.style.setProperty(name, value)
    }
    el.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    return new XMLSerializer().serializeToString(el)
}

export async function svgToPngBlob (svg, { scale = 2, theme = {} } = {}) {
    const standalone = serializeSvg(svg, theme)
    const el = parseSvg(standalone)
    const width = Number(el.getAttribute('width'))
    const height = Number(el.getAttribute('height'))
    const image = new Image()
    await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(standalone)
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width * scale)
    canvas.height = Math.ceil(height * scale)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = theme['--pele-bg'] || '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png')
    })
}
