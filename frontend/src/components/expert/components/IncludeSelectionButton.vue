<template>
    <div class="selection-button" :class="{active: modelValue}" @click="toggleSelection">
        <div class="text">
            <span>Selection</span>
            <span class="counter italic" :title="selectionTitle">( {{ selectedCounter }} {{ pluralize('node', selectedCounter) }} )</span>
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
import { mapActions, mapState } from 'vuex'

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
            required: false,
            default: true
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

            const nodesList = Object.keys(map).map(k => `${map[k]} x ${k}`).join('\n')

            return `Selected nodes: \n${nodesList}`
        }
    },
    methods: {
        pluralize,
        ...mapActions('product/assistant', ['setSelectedNodes']),
        toggleSelection () {
            this.$emit('update:modelValue', !this.modelValue)
            this.setSelectedNodes([])
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
        margin-right: 5px;
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
