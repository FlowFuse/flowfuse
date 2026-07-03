<template>
    <div class="chip" :class="{active: modelValue, disabled}" :title="title" @click="onClick">
        <div class="text">
            <slot name="text">
                <span>{{ text }}</span>
            </slot>
        </div>

        <span class="separator" />

        <div class="icon-wrapper">
            <slot name="icon" :active="modelValue">
                <XMarkIcon v-if="modelValue" class="ff-icon ff-icon-sm" />
                <PlusIcon v-else class="ff-icon ff-icon-sm" />
            </slot>
        </div>
    </div>
</template>

<script>
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'

import { pluralize } from '../../../../composables/strings/String.js'

export default {
    name: 'DefaultChip',
    components: {
        XMarkIcon,
        PlusIcon
    },
    props: {
        modelValue: {
            type: Boolean,
            required: false,
            default: true
        },
        text: {
            type: String,
            required: false,
            default: ''
        },
        title: {
            type: String,
            required: false,
            default: ''
        },
        disabled: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    emits: ['toggle'],
    methods: {
        pluralize,
        onClick () {
            if (this.disabled) return
            this.$emit('toggle')
        }
    }
}
</script>

<style scoped lang="scss">
.chip {
    border: 1px solid var(--ff-color-border);
    border-radius: 5px;
    background: var(--ff-color-bg-surface);
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;
    transition: 0.3s ease-in-out;
    white-space: nowrap;

    &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    &.active {
        background: var(--ff-color-accent-surface);
        border: 1px solid var(--ff-color-accent-light);

        .separator {
            background: var(--ff-color-chip-default-bg);
        }
    }

    .icon-wrapper {
        display: flex;
        align-items: center;
        margin-right: 5px;
    }

    .separator {
        width: 1px;
        align-self: stretch;
        background: var(--ff-color-status-warning-bg);
    }

    .text {
        padding: 0.25rem 0.50rem 0.25rem 0.25rem;
        align-items: center;
        font-size: $ff-funit-sm;
        display: flex;
        gap: 2px;
    }
}
</style>
