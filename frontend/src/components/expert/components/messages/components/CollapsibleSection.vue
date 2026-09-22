<template>
    <div class="ff-collapsible" :class="{ 'is-up': openUp }">
        <div class="ff-collapsible--header" @click="toggle">
            <ChevronRightIcon class="ff-collapsible--chevron" :class="{ rotated: expanded }" />
            <slot name="header" />
        </div>
        <div class="ff-collapsible--content" :class="{ expanded }">
            <div class="ff-collapsible--inner" :inert="!expanded">
                <slot />
            </div>
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/20/solid'

export default {
    name: 'CollapsibleSection',
    components: { ChevronRightIcon },
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
    padding: 0.25rem 0;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--ff-color-text-subtle);

    &:hover {
        color: var(--ff-color-text);
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
