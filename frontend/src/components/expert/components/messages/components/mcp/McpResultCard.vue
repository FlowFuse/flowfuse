<template>
    <div class="mcp-result-card" :class="[`mcp-result-card--${ui.status || 'success'}`]">
        <div class="mcp-result-card--header">
            <span class="mcp-result-card--status-icon">
                <span v-if="ui.status === 'error'">✗</span>
                <span v-else>✓</span>
            </span>
            <span class="mcp-result-card--title">{{ ui.title }}</span>
        </div>
        <p v-if="ui.subtitle" class="mcp-result-card--subtitle">
            {{ ui.subtitle }}
        </p>
        <div v-if="ui.actions && ui.actions.length" class="mcp-result-card--actions">
            <ff-button
                v-for="action in ui.actions"
                :key="action.id"
                :kind="action.variant === 'primary' ? 'primary' : 'secondary'"
                size="small"
                @click="handleAction(action)"
            >
                {{ action.label }}
            </ff-button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'McpResultCard',
    props: {
        ui: {
            type: Object,
            required: true
        }
    },
    emits: ['action'],
    methods: {
        handleAction (action) {
            if (action.navigation) {
                this.$emit('action', { actionId: action.id, navigation: action.navigation })
            } else {
                this.$emit('action', { actionId: action.id })
            }
        }
    }
}
</script>

<style scoped lang="scss">
.mcp-result-card {
    background-color: $ff-grey-50;
    border: 1px solid $ff-grey-200;
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mcp-result-card--success {
    border-color: $ff-green-300;
    background-color: $ff-green-50;

    .mcp-result-card--status-icon {
        color: $ff-green-600;
    }
}

.mcp-result-card--error {
    border-color: $ff-red-300;
    background-color: $ff-red-50;

    .mcp-result-card--status-icon {
        color: $ff-red-600;
    }
}

.mcp-result-card--header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.mcp-result-card--status-icon {
    font-weight: 700;
    font-size: 1rem;
    flex-shrink: 0;
}

.mcp-result-card--title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: $ff-grey-800;
}

.mcp-result-card--subtitle {
    font-size: 0.875rem;
    color: $ff-grey-600;
    margin: 0;
}

.mcp-result-card--actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
}
</style>
