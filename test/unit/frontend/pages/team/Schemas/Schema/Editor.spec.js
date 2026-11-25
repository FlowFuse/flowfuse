import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import { ref } from 'vue'

import SchemaEditor from '../../../../../../../frontend/src/pages/team/Schemas/Schema/Editor.vue'

const DRAFT = { status: 'draft', schema: { type: 'object' }, notes: '', problems: [] }

function mountEditor ({ loadFailed = false, draft = DRAFT, readOnly = false } = {}) {
    return mount(SchemaEditor, {
        props: { draft, latestPublished: null, readOnly, markers: [], problemCount: 0, notes: '', schemaText: '{"type": "object"}', editorProblems: 0 },
        global: {
            stubs: {
                'ff-button': { template: '<button><slot /></button>' },
                ToggleButtonGroup: { emits: ['update:modelValue'], template: '<button data-action="show-json" @click="$emit(\'update:modelValue\', \'json\')" />' },
                SchemaBuilder: { template: '<div data-el="schema-builder" />' },
                FfAccordion: true,
                JsonEditor: {
                    template: '<div data-el="json-editor" />',
                    setup: (_, { expose }) => { expose({ format () {}, replace () {}, loadFailed: ref(loadFailed) }) }
                }
            }
        }
    })
}

const showJson = (editor) => editor.find('[data-action="show-json"]').trigger('click')

describe('Schema editor tab', () => {
    test('opens on the builder, with the JSON view a click away', async () => {
        const editor = mountEditor()
        expect(editor.find('[data-el="schema-builder"]').exists()).toBe(true)
        expect(editor.find('[data-el="builder-root-type"]').text()).toBe('Root type object')
        expect(editor.find('[data-action="format-json"]').exists()).toBe(false)
        await showJson(editor)
        expect(editor.find('[data-el="schema-builder"]').exists()).toBe(false)
    })

    test('offers Format and Import on a draft', async () => {
        const editor = mountEditor()
        await showJson(editor)
        expect(editor.find('[data-action="format-json"]').exists()).toBe(true)
        expect(editor.find('[data-action="import-json"]').exists()).toBe(true)
    })

    test('hides Format and Import when the JSON editor failed to load, as they work through it', async () => {
        const editor = mountEditor({ loadFailed: true })
        await showJson(editor)
        expect(editor.find('[data-action="format-json"]').exists()).toBe(false)
        expect(editor.find('[data-action="import-json"]').exists()).toBe(false)
    })

    test('hides Format and Import when there is no draft to change', async () => {
        const editor = mountEditor({ draft: null })
        await showJson(editor)
        expect(editor.find('[data-action="format-json"]').exists()).toBe(false)
        expect(editor.find('[data-action="import-json"]').exists()).toBe(false)
    })
})
