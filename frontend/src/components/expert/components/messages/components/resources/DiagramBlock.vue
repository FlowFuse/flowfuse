<template>
    <div class="ff-code-block ff-diagram-block" :data-diagram-type="type">
        <div class="ff-code-block--header">
            <!-- Same icons as the copy button of the code blocks around it -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <button type="button" class="ff-code-block--copy" title="Copy code" @click.stop="copySource" v-html="copied ? ICON_CHECK : ICON_DUPLICATE" />
            <div class="ff-diagram-block--actions">
                <ff-button
                    kind="tertiary"
                    size="small"
                    data-action="toggle-code"
                    :class="{ active: showCode }"
                    :aria-pressed="String(showCode)"
                    @click="showCode = !showCode"
                >
                    Code
                </ff-button>
                <ff-kebab-menu data-el="diagram-export">
                    <ff-kebab-item label="Copy SVG" @click="copySvg" />
                    <ff-kebab-item label="Copy image" @click="copyImage" />
                    <ff-kebab-item label="Download PNG" @click="downloadPng" />
                </ff-kebab-menu>
            </div>
            <span class="ff-code-block--lang">{{ type }}</span>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <pre v-show="showCode"><code class="hljs" v-html="highlightedSource" /></pre>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-show="!showCode" ref="diagram" class="ff-diagram-block--svg" v-html="safeSvg" />
    </div>
</template>

<script>
import { THEME_VARIABLES, sanitizeDiagram, serializeSvg, svgToPngBlob } from '@/composables/strings/Diagram.js'
import { CODE_BLOCK_ICONS, highlightCode } from '@/composables/strings/Markdown.js'
import Alerts from '@/services/alerts.js'

export default {
    name: 'DiagramBlock',
    props: {
        // The language of the code block, such as mermaid
        type: {
            type: String,
            required: true
        },
        source: {
            type: String,
            required: true
        },
        // Rendered by the Expert
        svg: {
            type: String,
            required: true
        }
    },
    setup () {
        return { ...CODE_BLOCK_ICONS }
    },
    data () {
        return {
            showCode: false,
            copied: false
        }
    },
    computed: {
        safeSvg () {
            return sanitizeDiagram(this.svg)
        },
        highlightedSource () {
            return highlightCode(this.source, this.type)
        }
    },
    beforeUnmount () {
        clearTimeout(this.copiedTimer)
    },
    methods: {
        async copySource () {
            await navigator.clipboard.writeText(this.source)
            this.copied = true
            clearTimeout(this.copiedTimer)
            this.copiedTimer = setTimeout(() => { this.copied = false }, 2000)
        },
        // The page theme, so exports look like the diagram on screen
        theme () {
            const style = getComputedStyle(this.$refs.diagram)
            const theme = {}
            for (const name of THEME_VARIABLES) {
                const value = style.getPropertyValue(name).trim()
                if (value) {
                    theme[name] = value
                }
            }
            return theme
        },
        async copySvg () {
            try {
                await navigator.clipboard.writeText(serializeSvg(this.safeSvg, this.theme()))
                Alerts.emit('Copied to Clipboard.', 'confirmation')
            } catch (_) {
                Alerts.emit('Could not copy the diagram.', 'warning')
            }
        },
        async copyImage () {
            try {
                // The blob is passed as a promise, so Safari still treats the copy as part of the click
                const blob = svgToPngBlob(this.safeSvg, { theme: this.theme() })
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                Alerts.emit('Copied to Clipboard.', 'confirmation')
            } catch (_) {
                Alerts.emit('Could not copy the diagram.', 'warning')
            }
        },
        async downloadPng () {
            try {
                const blob = await svgToPngBlob(this.safeSvg, { theme: this.theme() })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'diagram.png'
                a.click()
                // Revoking straight after the click can cancel the download in Safari and Firefox
                setTimeout(() => URL.revokeObjectURL(url), 40 * 1000)
            } catch (_) {
                Alerts.emit('Could not download the diagram.', 'warning')
            }
        }
    }
}
</script>

<style scoped lang="scss">
.ff-code-block.ff-diagram-block {
    .ff-code-block--header {
        justify-content: flex-start;
        gap: 0.5rem;
    }

    .ff-code-block--lang {
        margin-left: auto;
    }
}

.ff-diagram-block--actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.ff-diagram-block--svg {
    padding: 1rem;
    overflow-x: auto;
    background: var(--ff-color-bg-surface);

    :deep(svg) {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 0 auto;
    }
}

// Pele, which renders the mermaid diagrams, takes its colours from these variables,
// so the diagram follows the theme without being re-rendered
.ff-diagram-block[data-diagram-type="mermaid"] .ff-diagram-block--svg {
    --pele-bg: var(--ff-color-bg-surface);
    --pele-fg: var(--ff-color-text);
    --pele-muted: var(--ff-color-text-subtle);
    --pele-line: var(--ff-color-text-subtle);
    --pele-surface: var(--ff-color-bg-surface-raised);
    --pele-surface-alt: var(--ff-color-bg-surface-raised);
    --pele-border: var(--ff-color-accent);
    --pele-accent: var(--ff-color-accent);
}
</style>
