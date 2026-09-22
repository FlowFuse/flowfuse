<template>
    <div class="expert-prompt-suggestions" data-el="expert-prompt-suggestions">
        <div class="expert-prompt-suggestions__heading">
            <SparklesIcon class="ff-icon ff-icon-sm" />
            <span>Try one of these</span>
        </div>
        <div class="expert-prompt-suggestions__list">
            <button
                v-for="suggestion in suggestions"
                :key="suggestion.title"
                type="button"
                class="expert-prompt-suggestions__item"
                data-action="use-prompt-suggestion"
                :title="suggestion.prompt"
                @click="$emit('select', suggestion)"
            >
                <span class="expert-prompt-suggestions__title">{{ suggestion.title }}</span>
                <span class="expert-prompt-suggestions__prompt">{{ suggestion.prompt }}</span>
            </button>
        </div>
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/24/outline'

export default {
    name: 'PromptSuggestions',
    components: { SparklesIcon },
    props: {
        suggestions: {
            type: Array,
            required: true
        }
    },
    emits: ['select']
}
</script>

<style scoped lang="scss">
.expert-prompt-suggestions {
    margin: 1.25rem 0.25rem 0;

    &__heading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        margin-bottom: 0.5rem;
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--ff-color-text-subtle);
    }

    &__list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    &__item {
        display: block;
        width: 100%;
        padding: 0.625rem 0.75rem;
        text-align: left;
        border: 1px solid var(--ff-color-border);
        border-radius: 0.625rem;
        background: var(--ff-color-bg-surface);
        cursor: pointer;

        &:hover {
            border-color: var(--ff-color-accent);
            box-shadow: 0 1px 3px rgb(0 0 0 / 6%);
        }
    }

    &__title {
        display: block;
        margin-bottom: 0.125rem;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--ff-color-text-deep);
    }

    &__prompt {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        font-size: 0.75rem;
        line-height: 1.3;
        color: var(--ff-color-text-subtle);
    }
}
</style>
