<template>
    <default-chip
        :modelValue="!!contextItem"
        :text="text"
        :title="title"
        @toggle="toggleSelection"
    />
</template>

<script>
import { mapActions, mapState } from 'pinia'

import { pluralize } from '../../../../composables/strings/String.js'

import DefaultChip from './DefaultChip.vue'

import { useProductAssistantStore } from '@/stores/product-assistant.js'

export default {
    name: 'ContextChip',
    components: {
        DefaultChip
    },
    props: {
        contextItem: {
            type: Object,
            required: false,
            default: () => ({})
        }
    },
    computed: {
        ...mapState(useProductAssistantStore, ['getSelectedContext']),
        selectedContext () {
            return this.getSelectedContext
        },
        text () {
            return this.contextItem.name || 'Unnamed Context'
        },
        title () {
            return this.contextItem.title || `Include ${this.contextItem.name} in context`
        }
    },
    methods: {
        ...mapActions(useProductAssistantStore, ['setSelectedContext']),
        pluralize,
        toggleSelection () {
            const currentSelection = this.selectedContext.filter(c => c.name !== this.contextItem.name)
            this.setSelectedContext(currentSelection)
        }
    }
}
</script>
