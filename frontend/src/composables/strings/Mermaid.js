import mermaid from 'mermaid'

let counter = 0

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

export async function renderMermaid (source, el) {
    mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: themeVariables(el)
    })
    const { svg } = await mermaid.render(`ff-mermaid-${counter++}`, source)
    return svg
}
