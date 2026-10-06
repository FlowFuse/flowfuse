import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import PromptSuggestions from '../../../../../frontend/src/components/expert/components/PromptSuggestions.vue'
import { PROMPT_SUGGESTIONS, pickSuggestions } from '../../../../../frontend/src/components/expert/prompt-suggestions.js'

const suggestions = [
    { title: 'Am I backed up?', prompt: 'Check when my instances were last snapshotted.' },
    { title: 'Answer this from my tables', prompt: 'Answer this: ', needsInput: true }
]

describe('pickSuggestions', () => {
    test('draws the requested number of distinct suggestions', () => {
        const picked = pickSuggestions(3)
        expect(picked).toHaveLength(3)
        expect(new Set(picked.map(s => s.title)).size).toBe(3)
    })

    test('never draws more than the pool holds', () => {
        expect(pickSuggestions(3, suggestions)).toHaveLength(2)
        expect(pickSuggestions(3, [])).toHaveLength(0)
    })

    test('every entry in the shipped list has a title and a prompt', () => {
        PROMPT_SUGGESTIONS.forEach(suggestion => {
            expect(suggestion.title.length).toBeGreaterThan(0)
            expect(suggestion.prompt.length).toBeGreaterThan(0)
        })
    })

    test('a prompt flagged as needing input is left unfinished, ready to be typed into', () => {
        PROMPT_SUGGESTIONS.filter(s => s.needsInput).forEach(suggestion => {
            expect(suggestion.prompt.endsWith(' ')).toBe(true)
        })
    })
})

describe('PromptSuggestions', () => {
    test('renders a row per suggestion, showing both the title and the prompt', () => {
        const wrapper = mount(PromptSuggestions, { props: { suggestions } })
        const rows = wrapper.findAll('[data-action="use-prompt-suggestion"]')

        expect(rows).toHaveLength(2)
        expect(rows[0].text()).toContain('Am I backed up?')
        expect(rows[0].text()).toContain('Check when my instances were last snapshotted.')
    })

    test('emits the clicked suggestion', async () => {
        const wrapper = mount(PromptSuggestions, { props: { suggestions } })

        await wrapper.findAll('[data-action="use-prompt-suggestion"]')[1].trigger('click')

        expect(wrapper.emitted('select')[0][0]).toEqual(suggestions[1])
    })
})
