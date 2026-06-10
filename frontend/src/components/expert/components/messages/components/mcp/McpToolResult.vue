<template>
    <div class="mcp-tool-result">
        <mcp-confirmation
            v-if="ui.type === 'confirmation'"
            :ui="ui"
            @action="$emit('action', $event)"
        />
        <mcp-selection
            v-else-if="ui.type === 'selection'"
            :ui="ui"
            @select="$emit('action', { type: 'select', ...$event })"
        />
        <mcp-text-input
            v-else-if="ui.type === 'text-input'"
            :ui="ui"
            @submit="$emit('action', { type: 'text-submit', ...$event })"
        />
        <mcp-progress
            v-else-if="ui.type === 'progress'"
            :ui="ui"
        />
        <mcp-result-card
            v-else-if="ui.type === 'result-card'"
            :ui="ui"
            @action="$emit('action', $event)"
        />
        <mcp-status-badge
            v-else-if="ui.type === 'status-badge'"
            :ui="ui"
        />
    </div>
</template>

<script>
import McpConfirmation from './McpConfirmation.vue'
import McpProgress from './McpProgress.vue'
import McpResultCard from './McpResultCard.vue'
import McpSelection from './McpSelection.vue'
import McpStatusBadge from './McpStatusBadge.vue'
import McpTextInput from './McpTextInput.vue'

export default {
    name: 'McpToolResult',
    components: {
        McpConfirmation,
        McpSelection,
        McpTextInput,
        McpProgress,
        McpResultCard,
        McpStatusBadge
    },
    props: {
        ui: {
            type: Object,
            required: true
        }
    },
    emits: ['action']
}
</script>

<style scoped lang="scss">
.mcp-tool-result {
    width: 100%;
}
</style>
