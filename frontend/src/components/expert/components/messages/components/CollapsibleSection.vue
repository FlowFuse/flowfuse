<template>
    <div class="ff-collapsible" :class="{ 'is-up': openUp }">
        <ff-button
            v-if="collapsible"
            kind="plain"
            align="left"
            class="ff-collapsible--header"
            :aria-expanded="expanded ? 'true' : 'false'"
            @click="toggle"
        >
            <ChevronRightIcon class="ff-collapsible--chevron" :class="{ rotated: expanded }" />
            <slot name="header" />
        </ff-button>
        <div v-else class="ff-collapsible--header is-static">
            <span class="ff-collapsible--chevron" />
            <slot name="header" />
        </div>
        <slot name="summary" :expanded="expanded" />
        <div v-if="collapsible" class="ff-collapsible--content" :class="{ expanded }">
            <div class="ff-collapsible--inner" :inert="!expanded">
                <slot />
            </div>
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/20/solid'

import FfButton from '../../../../../ui-components/components/Button.vue'

export default {
    name: 'CollapsibleSection',
    components: { ChevronRightIcon, FfButton },
    props: {
        autoOpen: {
            type: Boolean,
            default: false
        },
        forceOpen: {
            type: Boolean,
            default: false
        },
        openUp: {
            type: Boolean,
            default: false
        },
        // Off when there is nothing to expand: no chevron and no toggle.
        collapsible: {
            type: Boolean,
            default: true
        }
    },
    data () {
        return {
            manualExpanded: null
        }
    },
    computed: {
        expanded () {
            if (this.forceOpen) return true
            return this.manualExpanded !== null ? this.manualExpanded : this.autoOpen
        }
    },
    methods: {
        toggle () {
            if (this.forceOpen) return
            this.manualExpanded = !this.expanded
        }
    }
}
</script>

<style scoped lang="scss">
.ff-collapsible {
    display: flex;
    flex-direction: column;

    &.is-up {
        flex-direction: column-reverse;
    }
}

.ff-collapsible--header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.25rem 0;
    text-align: left;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--ff-color-text-subtle);

    &:hover {
        color: var(--ff-color-text);
    }

    &:focus-visible {
        outline: 2px solid var(--ff-color-focus);
        outline-offset: 2px;
        border-radius: 0.25rem;
    }

    &.is-static {
        cursor: default;

        &:hover {
            color: var(--ff-color-text-subtle);
        }
    }
}

.ff-collapsible--chevron {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    transition: transform 0.2s ease;

    &.rotated {
        transform: rotate(90deg);
    }
}

.ff-collapsible--content {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 0.22s ease, opacity 0.22s ease;

    &.expanded {
        grid-template-rows: 1fr;
        opacity: 1;
    }
}

.ff-collapsible--inner {
    min-height: 0;
    overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
    .ff-collapsible--content {
        transition: none;
    }
}
</style>
