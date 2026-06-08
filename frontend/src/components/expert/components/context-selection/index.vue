<template>
    <div class="context-selector-container">
        <context-selector-button v-if="!isInsightsAgent" />
        <div class="chips-container" @wheel="horizontalScrolling">
            <context-chip v-for="(context, index) in selectedContextFiltered" :key="index" :contextItem="context" />
            <debug-chip v-if="hasDebugLogsSelected && !isInsightsAgent" />
            <selection-chip v-if="hasUserSelection && !isInsightsAgent" />
        </div>
    </div>
</template>

<script>
import { mapState } from 'pinia'

import ContextChip from '../chips/ContextChip.vue'
import DebugChip from '../chips/DebugChip.vue'
import SelectionChip from '../chips/SelectionChip.vue'

import ContextSelectorButton from './ContextSelectorButton.vue'

import { useProductAssistantStore } from '@/stores/product-assistant.js'
import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'ContextSelector',
    components: {
        ContextChip,
        DebugChip,
        SelectionChip,
        ContextSelectorButton
    },
    computed: {
        ...mapState(useProductAssistantStore, ['getSelectedContext', 'hasDebugLogsSelected', 'hasUserSelection']),
        ...mapState(useProductExpertStore, ['isInsightsAgent']),
        selectedContext () {
            // for insights mode, return empty array
            if (this.isInsightsAgent) {
                return []
            }
            return this.getSelectedContext
        },
        selectedContextFiltered () {
            return this.selectedContext.filter(c => c.showAsChip !== false)
        }
    },
    methods: {
        horizontalScrolling (event) {
            const target = event.currentTarget
            if (event.deltaY === 0) return
            event.preventDefault()
            target.scrollLeft += event.deltaY / 2
        }
    }
}
</script>

<style scoped lang="scss">
.context-selector-container {
    display: flex;
    justify-content: flex-start;
    overflow: auto;
    flex: 1;

    .chips-container {
        flex: 1;
        overflow-x: auto;
        scrollbar-width: none;
        display: flex;
        gap: 0.5rem;
    }
}
</style>
