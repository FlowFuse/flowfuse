import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, h, onMounted, provide } from 'vue'

vi.mock('../../../../frontend/src/services/product.js', () => ({
    default: {
        capture: vi.fn()
    }
}))

vi.mock('../../../../frontend/src/components/expert/prompt-suggestions.js', async (importOriginal) => {
    const original = await importOriginal()
    return { ...original, pickSuggestions: vi.fn(original.pickSuggestions) }
})

const Product = (await import('../../../../frontend/src/services/product.js')).default
const { PROMPT_SUGGESTIONS, pickSuggestions } = await import('../../../../frontend/src/components/expert/prompt-suggestions.js')
const PromptSuggestions = (await import('../../../../frontend/src/components/expert/components/PromptSuggestions.vue')).default
const { usePromptSuggestions } = await import('../../../../frontend/src/composables/PromptSuggestions.ts')
const { useContextStore } = await import('../../../../frontend/src/stores/context.js')

function pinia () {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useContextStore(pinia).team = { id: 'team-1' }
    return pinia
}

// Runs the composable inside a component, so it can inject and reach the stores
function withSetup (options, { provide } = {}) {
    let result
    mount(defineComponent({
        setup () {
            result = usePromptSuggestions(options)
            return () => null
        }
    }), { global: { plugins: [pinia()], provide } })
    return result
}

// Wired the way the team overview uses it: the page provides `expert-surface`
// itself, shows the suggestions as soon as it opens, and handles the click
const OverviewLike = defineComponent({
    setup () {
        provide('expert-surface', 'overview')
        const { suggestions, trackShown, trackClick } = usePromptSuggestions({ surface: 'overview' })
        onMounted(trackShown)
        return () => h(PromptSuggestions, { suggestions: suggestions.value, onSelect: trackClick })
    }
})

function events (name) {
    return Product.capture.mock.calls.filter(([event]) => event === name)
}

describe('usePromptSuggestions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('deals three suggestions straight away', () => {
        const { suggestions } = withSetup()
        expect(suggestions.value).toHaveLength(3)
    })

    test('reports a deal as shown once, however often it is asked to', () => {
        const { suggestions, trackShown } = withSetup()

        trackShown()
        trackShown()

        expect(events('ff-expert-suggestions-shown')).toEqual([[
            'ff-expert-suggestions-shown',
            {
                ids: suggestions.value.map(s => s.id),
                titles: suggestions.value.map(s => s.title),
                surface: 'drawer'
            },
            { team: 'team-1' }
        ]])
    })

    test('a new deal is reported as shown again', () => {
        const { suggestions, deal, trackShown } = withSetup()
        trackShown()

        deal()
        trackShown()

        const shown = events('ff-expert-suggestions-shown')
        expect(shown).toHaveLength(2)
        expect(shown[1][1].ids).toEqual(suggestions.value.map(s => s.id))
    })

    test('the surface comes from expert-surface', () => {
        const { trackShown } = withSetup(undefined, { provide: { 'expert-surface': 'immersive' } })
        trackShown()
        expect(events('ff-expert-suggestions-shown')[0][1].surface).toBe('immersive')
    })

    test('the overview reports its suggestions as shown and which one was clicked', async () => {
        const wrapper = mount(OverviewLike, { global: { plugins: [pinia()] } })

        const shown = events('ff-expert-suggestions-shown')
        expect(shown).toHaveLength(1)
        expect(shown[0][1].surface).toBe('overview')

        const third = shown[0][1].ids[2]
        await wrapper.findAll('[data-action="use-prompt-suggestion"]')[2].trigger('click')

        const clicked = PROMPT_SUGGESTIONS.find(s => s.id === third)
        expect(events('ff-expert-suggestion-clicked')).toEqual([[
            'ff-expert-suggestion-clicked',
            {
                id: third,
                title: clicked.title,
                position: 3,
                needs_input: !!clicked.needsInput,
                surface: 'overview'
            },
            { team: 'team-1' }
        ]])
    })

    test('a suggestion without an id is recorded under its title', () => {
        pickSuggestions.mockReturnValueOnce([
            { id: 'with-id', title: 'Has an id', prompt: 'a' },
            { title: 'No id', prompt: 'b', needsInput: true }
        ])
        const { suggestions, trackShown, trackClick } = withSetup()

        trackShown()
        trackClick(suggestions.value[1])

        expect(events('ff-expert-suggestions-shown')[0][1].ids).toEqual(['with-id', 'No id'])
        expect(events('ff-expert-suggestion-clicked')[0][1]).toEqual({
            id: 'No id',
            title: 'No id',
            position: 2,
            needs_input: true,
            surface: 'drawer'
        })
    })

    test('every built-in suggestion has an id of its own', () => {
        const ids = PROMPT_SUGGESTIONS.map(s => s.id)
        expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true)
        expect(new Set(ids).size).toBe(ids.length)
    })
})
