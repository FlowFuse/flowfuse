<template>
    <p v-if="loadFailed" class="json-editor json-editor--failed" data-el="json-editor-error">The editor failed to load. Reload the page to try again.</p>
    <div v-else ref="container" class="json-editor" :style="{ height: `${contentHeight}px` }" data-el="json-editor" />
</template>

<script setup lang="ts">
import type * as Monaco from 'monaco-editor/editor'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useThemeStore } from '@/stores/theme'

defineOptions({ name: 'JsonEditor' })

const props = withDefaults(defineProps<{
    readOnly: boolean
    markers?: { offset: number, length: number, message: string }[]
}>(), {
    markers: () => []
})

const text = defineModel<string>({ required: true })
const problems = defineModel<number>('problems', { default: 0 })

const container = ref<HTMLElement | null>(null)
const contentHeight = ref(0)
const loadFailed = ref(false)
const themeStore = useThemeStore()

let monaco: typeof Monaco | null = null
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let markersListener: Monaco.IDisposable | null = null

async function loadMonaco () {
    self.MonacoEnvironment = {
        getWorker: (_workerId, label) => label === 'json'
            ? new Worker(/* webpackChunkName: "monaco-json-worker" */ new URL('monaco-editor/languages/features/json/json.worker', import.meta.url))
            : new Worker(/* webpackChunkName: "monaco-editor-worker" */ new URL('monaco-editor/editor/editor.worker', import.meta.url))
    }
    const [api, , json] = await Promise.all([
        import('monaco-editor/editor'),
        import('monaco-editor/features/register.all'),
        import('monaco-editor/languages/features/json/register')
    ])
    // The 2020-12 meta-schema isn't bundled, so a "$schema" key would otherwise raise a load warning
    json.jsonDefaults.setDiagnosticsOptions({ validate: true, enableSchemaRequest: false, schemaRequest: 'ignore' })
    return api
}

function cssVar (name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function applyTheme () {
    if (!monaco) return
    monaco.editor.defineTheme('flowfuse', {
        base: themeStore.effective === 'dark' ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': cssVar('--ff-color-bg-surface')
        }
    })
    monaco.editor.setTheme('flowfuse')
}

function applyMarkers () {
    const model = editor?.getModel()
    if (!monaco || !model) return
    monaco.editor.setModelMarkers(model, 'json-editor', props.markers.map(marker => {
        const start = model.getPositionAt(marker.offset)
        const end = model.getPositionAt(marker.offset + marker.length)
        return {
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column,
            message: marker.message,
            severity: monaco!.MarkerSeverity.Error
        }
    }))
}

function countProblems () {
    const model = editor?.getModel()
    if (!monaco || !model) return
    // Warnings such as duplicate keys don't stop a save or publish
    problems.value = monaco.editor.getModelMarkers({ resource: model.uri })
        .filter(marker => marker.severity === monaco!.MarkerSeverity.Error).length
}

onMounted(async () => {
    try {
        monaco = await loadMonaco()
    } catch (err) {
        console.error(err)
        loadFailed.value = true
        return
    }
    if (!container.value) return
    applyTheme()
    editor = monaco.editor.create(container.value, {
        value: text.value,
        language: 'json',
        theme: 'flowfuse',
        readOnly: props.readOnly,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fixedOverflowWidgets: true,
        scrollbar: { alwaysConsumeMouseWheel: false }
    })
    contentHeight.value = editor.getContentHeight()
    editor.onDidContentSizeChange(({ contentHeight: height }) => { contentHeight.value = height })
    markersListener = monaco.editor.onDidChangeMarkers(countProblems)
    editor.onDidChangeModelContent(() => { text.value = editor!.getValue() })
    applyMarkers()
    countProblems()
})

watch(text, (value) => {
    if (editor && value !== editor.getValue()) editor.setValue(value)
})
watch(() => props.markers, applyMarkers, { flush: 'post' })
watch(() => props.readOnly, (readOnly) => editor?.updateOptions({ readOnly }))
watch(() => themeStore.effective, applyTheme, { flush: 'post' })

onBeforeUnmount(() => {
    markersListener?.dispose()
    const model = editor?.getModel()
    editor?.dispose()
    model?.dispose()
})

function format () {
    return editor?.getAction('editor.action.formatDocument')?.run()
}

function replace (value: string) {
    const model = editor?.getModel()
    if (!editor || !model) return
    editor.pushUndoStop()
    editor.executeEdits('import', [{ range: model.getFullModelRange(), text: value }])
    editor.pushUndoStop()
}

defineExpose({ format, replace })
</script>

<style scoped>
.json-editor--failed {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ff-color-text-subtle);
}

.json-editor {
    min-height: 200px;
    max-height: 70vh;
    border: 1px solid var(--ff-color-border);
    border-radius: 6px;
    overflow: hidden;
}
</style>
