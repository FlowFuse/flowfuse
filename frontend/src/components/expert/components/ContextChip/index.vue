<template>
    <div class="selection-button" :class="{active: modelValue}" :title="title" @click="$emit('toggle')">
        <div class="text">
            <slot name="text">
                <span>{{ text }}</span>
            </slot>
        </div>

        <span class="separator" />

        <div class="icon-wrapper">
            <XIcon v-if="modelValue" class="ff-icon ff-icon-sm" />
            <PlusIcon v-else class="ff-icon ff-icon-sm" />
        </div>
    </div>
</template>

<script>
import { PlusIcon, XIcon } from '@heroicons/vue/outline'

import { pluralize } from '../../../../composables/String.js'

export default {
    name: 'ContextChip',
    components: {
        XIcon,
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
        }
    },
    emits: ['toggle'],
    methods: {
        pluralize
    }
}
</script>

<style scoped lang="scss">
.selection-button {
    border: 1px solid $ff-grey-200;
    border-radius: 5px;
    background: $ff-grey-50;
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;
    transition: 0.3s ease-in-out;
    white-space: nowrap;

    &.active {
        background: $ff-indigo-100;
        border: 1px solid $ff-indigo-300;

        .separator {
            background: $ff-indigo-300;
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
        background: $ff-yellow-100;
    }

    .text {
        padding: 0.25rem 0.50rem 0.25rem 0.25rem;

        font-size: $ff-funit-sm;
        display: flex;
        gap: 2px;
    }
}
</style>
