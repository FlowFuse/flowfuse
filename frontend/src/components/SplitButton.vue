<template>
    <div class="ff-split-button" :class="{ 'ff-split-button--primary': primary }">
        <button
            v-ff-tooltip:left="disabled ? disabledReason : undefined"
            class="ff-split-button__action"
            :class="{ 'ff-split-button--disabled': disabled }"
            :data-action="dataAction"
            :disabled="disabled"
            @click.stop.prevent="$emit('primary-click', $event)"
            @click.middle.stop.prevent="$emit('primary-click', $event)"
        >
            <slot name="icon" />
            <span class="hidden sm:inline ff-split-button__label">{{ label }}</span>
        </button>
        <DropdownMenu
            class="ff-split-button__dropdown"
            :buttonClass="'ff-split-button__toggle' + (resolvedDropdownDisabled ? ' ff-split-button--disabled' : '')"
            :options="options"
            :disabled="resolvedDropdownDisabled"
            @click.stop
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import DropdownMenu from './DropdownMenu.vue'

interface DropdownOption {
    name: string
    action?: (event?: Event) => void
    disabled?: boolean
    [key: string]: unknown
}

const props = withDefaults(defineProps<{
    label?: string
    dataAction?: string | null
    primary?: boolean
    disabled?: boolean
    dropdownDisabled?: boolean | null
    disabledReason?: string | null
    options?: DropdownOption[]
}>(), {
    label: '',
    dataAction: null,
    primary: false,
    disabled: false,
    dropdownDisabled: null,
    disabledReason: null,
    options: () => []
})

defineEmits<{
    'primary-click': [event: MouseEvent]
}>()

const resolvedDropdownDisabled = computed(() => props.dropdownDisabled ?? props.disabled)
</script>

<style lang="scss">
// Split dropdown button: two halves styled as one cohesive element
.ff-split-button {
    display: inline-flex;
    position: relative;
}

// Shared base styles for both halves (mirrors .ff-btn .ff-btn--secondary)
.ff-split-button__action,
.ff-split-button__toggle {
    display: flex;
    align-items: center;
    gap: $ff-unit-xs;
    font-size: $ff-funit-sm;
    font-weight: 600;
    line-height: 20px;
    background-color: var(--ff-color-bg-app);
    color: var(--ff-color-accent-text);
    border: 1px solid var(--ff-color-accent-strong);
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;

    &:hover:not(:disabled) {
        background-color: var(--ff-color-accent);
        border-color: var(--ff-color-accent);
        color: var(--ff-color-text-on-brand);
    }

    &:disabled,
    &.ff-split-button--disabled {
        cursor: not-allowed;
        border-color: var(--ff-color-border-strong);
        color: var(--ff-color-text-subtle);
        background-color: var(--ff-color-bg-surface);
    }

    .ff-btn--icon {
        width: 20px;
        height: 20px;
    }
}

// Left half: main action button
.ff-split-button__action {
    padding: $ff-unit-sm 12px $ff-unit-sm $ff-unit-sm;
    border-radius: $ff-unit-sm 0 0 $ff-unit-sm;
    border-right: none;
    white-space: nowrap;
}

// DropdownMenu wrapper: make all wrapper divs invisible to flex layout
// so the MenuButton becomes a direct flex child of .ff-split-button
.ff-split-button__dropdown,
.ff-split-button__dropdown > div,
.ff-split-button__dropdown > div > div {
    display: contents;
}

// Right half: chevron dropdown trigger (square)
.ff-split-button__toggle {
    justify-content: center;
    padding: $ff-unit-sm;
    border-radius: 0 $ff-unit-sm $ff-unit-sm 0;
    border-left: 1px solid var(--ff-color-accent-strong);

    .ff-btn--icon {
        width: 20px;
        height: 20px;
    }

    &:hover:not(:disabled) {
        border-left-color: var(--ff-color-accent);
    }

    &:disabled,
    &.ff-split-button--disabled {
        border-left-color: var(--ff-color-border-strong);
    }
}

// Primary variant: filled indigo background with white text
.ff-split-button--primary {
    .ff-split-button__action,
    .ff-split-button__toggle {
        background-color: var(--ff-color-accent-strong);
        border-color: var(--ff-color-accent-strong);
        color: var(--ff-color-text-on-brand);

        &:hover:not(:disabled) {
            background-color: var(--ff-color-accent);
            border-color: var(--ff-color-accent);
        }
    }

    .ff-split-button__toggle {
        border-left-color: var(--ff-color-overlay-on-accent);

        &:hover:not(:disabled) {
            border-left-color: var(--ff-color-overlay-on-accent);
        }
    }
}

// Override icon-right margin from DropdownMenu's ChevronDownIcon
.ff-split-button__toggle .ff-btn--icon-right {
    margin-left: 0;
    margin-right: 0;
}

// Container query for drawer context - responsive button behavior
// Breakpoint matches DRAWER_MOBILE_BREAKPOINT constant in Editor/index.vue
// When inside drawer, respond to drawer width instead of viewport
@container drawer (min-width: 640px) {
  .ff-split-button__label {
    display: inline;
  }
}

@container drawer (max-width: 639px) {
  .ff-split-button__label {
    display: none;
  }
}
</style>
