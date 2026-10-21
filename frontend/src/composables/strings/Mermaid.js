// mermaid is large, so it is only loaded when a diagram needs rendering
let counter = 0

// Streamed content is re-created on every tick, so a finished diagram is re-attached from
// here instead of being rendered again. A failed render is stored as null.
const results = new Map()
const pending = new Map()

// Theme variables are read from the surrounding CSS so diagrams match the current colours.
function themeVariables (el) {
    const style = getComputedStyle(el)
    const read = name => style.getPropertyValue(name).trim() || undefined
    return {
        background: read('--ff-color-bg-surface'),
        primaryColor: read('--ff-color-bg-surface-raised'),
        primaryTextColor: read('--ff-color-text'),
        primaryBorderColor: read('--ff-color-accent'),
        lineColor: read('--ff-color-text-subtle'),
        textColor: read('--ff-color-text')
    }
}

// undefined: not rendered yet, null: failed to render, string: the SVG markup
export function getCachedDiagram (source) {
    return results.get(source)
}

export function renderMermaid (source, el) {
    if (!pending.has(source)) {
        pending.set(source, render(source, el).then(svg => {
            results.set(source, svg)
            return svg
        }, err => {
            results.set(source, null)
            throw err
        }))
    }
    return pending.get(source)
}

async function render (source, el) {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        // plain SVG text labels, so the diagram can be drawn onto a canvas for PNG export
        htmlLabels: false,
        flowchart: { htmlLabels: false },
        theme: 'base',
        themeVariables: themeVariables(el)
    })
    const { svg } = await mermaid.render(`ff-mermaid-${counter++}`, source)
    return svg
}

// Returns the diagram as standalone SVG markup with explicit pixel dimensions.
export function serializeSvg (svgEl) {
    const clone = svgEl.cloneNode(true)
    const [, , width, height] = (clone.getAttribute('viewBox') || '').split(/\s+/).map(Number)
    if (width && height) {
        clone.setAttribute('width', width)
        clone.setAttribute('height', height)
    }
    clone.style.maxWidth = ''
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    return new XMLSerializer().serializeToString(clone)
}

export async function svgToPngBlob (svgEl, { scale = 2, background = '#ffffff' } = {}) {
    const svg = serializeSvg(svgEl)
    const width = Number(svgEl.getAttribute('viewBox')?.split(/\s+/)[2]) || svgEl.getBoundingClientRect().width
    const height = Number(svgEl.getAttribute('viewBox')?.split(/\s+/)[3]) || svgEl.getBoundingClientRect().height
    const image = new Image()
    await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width * scale)
    canvas.height = Math.ceil(height * scale)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png')
    })
}
