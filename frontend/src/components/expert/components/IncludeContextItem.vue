<template>
    <ContextChip
        :modelValue="!!contextItem"
        :text="text"
        :title="title"
        @toggle="toggleSelection"
    />
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

import { pluralize } from '../../../composables/String.js'

import ContextChip from './ContextChip/index.vue'

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
        ...mapGetters('product/assistant', ['getSelectedContext']),
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
        ...mapActions('product/assistant', ['setSelectedContext']),
        pluralize,
        toggleSelection () {
            const currentSelection = this.selectedContext.filter(c => c.name !== this.contextItem.name)
            this.setSelectedContext(currentSelection)
        }
    }
}
</script>
