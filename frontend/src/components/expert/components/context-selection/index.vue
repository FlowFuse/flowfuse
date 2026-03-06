<template>
    <div class="context-selector-container">
        <context-selector-button v-if="!isOperatorAgent" />
        <div class="chips-container" @wheel="horizontalScrolling">
            <context-chip v-for="(context, index) in selectedContextFiltered" :key="index" :contextItem="context" />
            <debug-chip v-if="hasDebugLogsSelected && !isOperatorAgent" />
            <selection-chip v-if="hasUserSelection && !isOperatorAgent" />
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex'

import ContextChip from '../chips/ContextChip.vue'
import DebugChip from '../chips/DebugChip.vue'
import SelectionChip from '../chips/SelectionChip.vue'

import ContextSelectorButton from './ContextSelectorButton.vue'

export default {
    name: 'ContextSelector',
    components: {
        ContextChip,
        DebugChip,
        SelectionChip,
        ContextSelectorButton
    },
    computed: {
        ...mapGetters('product/assistant', ['getSelectedContext', 'hasDebugLogsSelected', 'hasUserSelection']),
        ...mapGetters('product/expert', ['isOperatorAgent']),
        selectedContext () {
            // for insights mode, return empty array
            if (this.isOperatorAgent) {
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
