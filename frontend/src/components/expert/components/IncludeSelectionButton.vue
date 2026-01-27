<template>
    <div class="selection-button" :class="{active: modelValue}" @click="toggleSelection">
        <div class="icon-wrapper">
            <XIcon v-if="modelValue" class="ff-icon ff-icon-sm" />
            <PlusIcon v-else class="ff-icon ff-icon-sm" />
        </div>

        <span class="separator" />
        <div class="text">
            <span>Include Selection</span>
            <span class="counter italic" :title="selectionTitle">( {{ selectedCounter }} {{ pluralize('node', selectedCounter) }} )</span>
        </div>
    </div>
</template>

<script>
import { PlusIcon, XIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import { pluralize } from '../../../composables/String.js'

export default {
    name: 'IncludeSelectionButton',
    components: {
        XIcon,
        PlusIcon
    },
    props: {
        modelValue: {
            type: Boolean,
            required: true
        }
    },
    emits: ['update:modelValue'],
    computed: {
        ...mapState('product/assistant', ['selectedNodes']),
        filteredSelectedNodes () {
            return this.selectedNodes.filter(n => !['global-config'].includes(n.type))
        },
        selectedCounter () {
            return this.filteredSelectedNodes.length
        },
        selectionTitle () {
            const map = {}

            this.filteredSelectedNodes.forEach(n => {
                map[n.type] = (map[n.type] ?? 0) + 1
            })

            return Object.keys(map).map(k => `${map[k]} x ${k}`).join('\n')
        }
    },
    methods: {
        pluralize,
        toggleSelection () {
            this.$emit('update:modelValue', !this.modelValue)
        }
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
        margin-left: 5px;
    }

    .separator {
        width: 1px;
        align-self: stretch;
        background: $ff-yellow-100;
    }

    .text {
        //padding: 3px 11px 3px 2px;
        padding: 0.25rem 0.50rem 0.25rem 0.25rem;

        font-size: $ff-funit-sm;
        display: flex;
        gap: 2px;
        .counter {
            cursor: help;
        }
    }
}
</style>
