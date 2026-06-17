<template>
    <div class="mcp-status-badge">
        <ul class="mcp-status-badge--list">
            <li v-for="item in ui.items" :key="item.label" class="mcp-status-badge--item">
                <span class="mcp-status-badge--dot" :class="[`mcp-status-badge--dot-${item.status}`]" />
                <span class="mcp-status-badge--content">
                    <span class="mcp-status-badge--label">{{ item.label }}</span>
                    <span v-if="item.meta" class="mcp-status-badge--meta">{{ item.meta }}</span>
                </span>
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'McpStatusBadge',
    props: {
        ui: {
            type: Object,
            required: true
        }
    }
}
</script>

<style scoped lang="scss">
.mcp-status-badge {
    background-color: $ff-grey-50;
    border: 1px solid $ff-grey-200;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
}

.mcp-status-badge--list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.mcp-status-badge--item {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
}

.mcp-status-badge--dot {
    flex-shrink: 0;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    margin-top: 0.25rem;
}

.mcp-status-badge--dot-running {
    background-color: $ff-green-500;
}

.mcp-status-badge--dot-stopped {
    background-color: $ff-red-500;
}

.mcp-status-badge--dot-suspended {
    background-color: $ff-yellow-500;
}

.mcp-status-badge--dot-starting,
.mcp-status-badge--dot-restarting {
    background-color: $ff-indigo-400;
}

.mcp-status-badge--dot-unknown {
    background-color: $ff-grey-400;
}

.mcp-status-badge--content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.mcp-status-badge--label {
    font-size: 0.875rem;
    font-weight: 500;
    color: $ff-grey-800;
}

.mcp-status-badge--meta {
    font-size: 0.8125rem;
    color: $ff-grey-500;
}
</style>
