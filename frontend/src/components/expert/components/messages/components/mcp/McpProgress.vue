<template>
    <div class="mcp-progress">
        <ul class="mcp-progress--steps">
            <li
                v-for="step in ui.steps"
                :key="step.id"
                class="mcp-progress--step"
                :class="[`mcp-progress--step-${step.status}`]"
            >
                <span class="mcp-progress--step-icon">
                    <span v-if="step.status === 'success'" class="mcp-progress--icon-success">✓</span>
                    <span v-else-if="step.status === 'error'" class="mcp-progress--icon-error">✗</span>
                    <span v-else-if="step.status === 'in-progress'" class="mcp-progress--icon-spinner" />
                    <span v-else class="mcp-progress--icon-pending">○</span>
                </span>
                <span class="mcp-progress--step-content">
                    <span class="mcp-progress--step-label">{{ step.label }}</span>
                    <span v-if="step.error" class="mcp-progress--step-error">{{ step.error }}</span>
                </span>
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'McpProgress',
    props: {
        ui: {
            type: Object,
            required: true
        }
    }
}
</script>

<style scoped lang="scss">
.mcp-progress {
    background-color: $ff-grey-50;
    border: 1px solid $ff-grey-200;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
}

.mcp-progress--steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mcp-progress--step {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
}

.mcp-progress--step-icon {
    flex-shrink: 0;
    width: 1.25rem;
    text-align: center;
    font-size: 0.875rem;
    line-height: 1.5rem;
}

.mcp-progress--icon-success {
    color: $ff-green-600;
    font-weight: 700;
}

.mcp-progress--icon-error {
    color: $ff-red-600;
    font-weight: 700;
}

.mcp-progress--icon-pending {
    color: $ff-grey-400;
}

.mcp-progress--icon-spinner {
    display: inline-block;
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid $ff-grey-300;
    border-top-color: $ff-indigo-600;
    border-radius: 50%;
    animation: mcp-spin 0.75s linear infinite;
    vertical-align: middle;
}

.mcp-progress--step-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.mcp-progress--step-label {
    font-size: 0.875rem;
    color: $ff-grey-800;
    line-height: 1.5rem;
}

.mcp-progress--step-error {
    font-size: 0.8125rem;
    color: $ff-red-600;
}

.mcp-progress--step-pending .mcp-progress--step-label {
    color: $ff-grey-400;
}

@keyframes mcp-spin {
    to { transform: rotate(360deg); }
}
</style>
