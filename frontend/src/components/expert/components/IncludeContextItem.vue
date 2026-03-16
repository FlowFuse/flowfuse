<template>
    <ContextChip
        :modelValue="!!contextItem"
        :text="text"
        :title="title"
        @toggle="toggleSelection"
    />
</template>

<script>
import { mapActions, mapState } from 'pinia'

import { pluralize } from '../../../composables/String.js'

import ContextChip from './ContextChip/index.vue'

import { useProductAssistantStore } from '@/stores/product-assistant.js'

export default {
    name: 'IncludeContextItem',
    components: {
        ContextChip
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
