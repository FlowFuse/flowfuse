<template>
    <div class="mcp-confirmation">
        <h4 v-if="ui.title" class="mcp-confirmation--title">
            {{ ui.title }}
        </h4>
        <dl v-if="ui.details && ui.details.length" class="mcp-confirmation--details">
            <template v-for="detail in ui.details" :key="detail.label">
                <dt>{{ detail.label }}</dt>
                <dd>{{ detail.value }}</dd>
            </template>
        </dl>
        <div v-if="ui.actions && ui.actions.length" class="mcp-confirmation--actions">
            <ff-button
                v-for="action in ui.actions"
                :key="action.id"
                :kind="action.variant === 'primary' ? 'primary' : 'secondary'"
                size="small"
                @click="$emit('action', { actionId: action.id })"
            >
                {{ action.label }}
            </ff-button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'McpConfirmation',
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
.mcp-confirmation {
    background-color: $ff-grey-50;
    border: 1px solid $ff-grey-200;
    border-radius: 0.5rem;
    padding: 1rem;
}

.mcp-confirmation--title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: $ff-grey-800;
    margin-bottom: 0.75rem;
}

.mcp-confirmation--details {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 1rem;
    margin-bottom: 1rem;

    dt {
        color: $ff-grey-500;
        font-size: 0.875rem;
        white-space: nowrap;
    }

    dd {
        color: $ff-grey-800;
        font-size: 0.875rem;
    }
}

.mcp-confirmation--actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
}
</style>
