import { inject, shallowRef } from 'vue'

import { pickSuggestions } from '@/components/expert/prompt-suggestions.js'
import Product from '@/services/product.js'
import { useContextStore } from '@/stores/context.js'

export interface PromptSuggestion {
    id?: string
    title: string
    prompt: string
    needsInput?: boolean
}

interface PromptSuggestionsOptions {
    // Which Expert surface offers the suggestions. Defaults to the `expert-surface`
    // the component is rendered under; a component that provides `expert-surface`
    // itself cannot inject it, so it passes the value here instead.
    surface?: string
}

function suggestionId (suggestion: PromptSuggestion): string {
    return suggestion.id ?? suggestion.title
}

/**
 * The conversation starters an Expert surface offers, and the PostHog events that
 * show which ones get clicked against how often each one is offered.
 *
 * A first set is dealt straight away; `deal` draws a new one. What a click does is
 * up to the surface, which calls `trackClick` from its own handler. `trackShown`
 * reports the current set once however often it is called, so a surface can call
 * it each time the suggestions come into view.
 */
export function usePromptSuggestions ({ surface }: PromptSuggestionsOptions = {}) {
    const expertSurface = surface ?? inject<string>('expert-surface', 'drawer')
    const contextStore = useContextStore()

    const suggestions = shallowRef<PromptSuggestion[]>([])
    let shown = false

    function capture (event: string, properties: Record<string, unknown>) {
        const team = contextStore.team?.id
        Product.capture(event, { ...properties, surface: expertSurface }, team ? { team } : undefined)
    }

    function deal () {
        // always a fresh array, so a surface watching it sees every new deal
        suggestions.value = pickSuggestions()
        shown = false
    }

    function trackShown () {
        if (shown || suggestions.value.length === 0) return
        shown = true
        capture('ff-expert-suggestions-shown', {
            ids: suggestions.value.map(suggestionId),
            titles: suggestions.value.map(suggestion => suggestion.title)
        })
    }

    function trackClick (suggestion: PromptSuggestion) {
        capture('ff-expert-suggestion-clicked', {
            id: suggestionId(suggestion),
            title: suggestion.title,
            position: suggestions.value.indexOf(suggestion) + 1,
            needs_input: !!suggestion.needsInput
        })
    }

    deal()

    return { suggestions, deal, trackShown, trackClick }
}
