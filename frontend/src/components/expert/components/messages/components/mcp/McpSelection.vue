<template>
    <div class="mcp-selection">
        <ul class="mcp-selection--list">
            <li
                v-for="option in ui.options"
                :key="option.id"
                class="mcp-selection--option"
                :class="{ 'is-selected': selectedId === option.id }"
                @click="selectOption(option)"
            >
                <span class="mcp-selection--radio" :class="{ 'is-selected': selectedId === option.id }" />
                <span class="mcp-selection--content">
                    <span class="mcp-selection--label">{{ option.label }}</span>
                    <span v-if="option.description" class="mcp-selection--description">{{ option.description }}</span>
                </span>
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'McpSelection',
    props: {
        ui: {
            type: Object,
            required: true
        }
    },
    emits: ['select'],
    data () {
        return {
            selectedId: null
        }
    },
    methods: {
        selectOption (option) {
            this.selectedId = option.id
            this.$emit('select', { id: option.id, label: option.label })
        }
    }
}
</script>

<style scoped lang="scss">
.mcp-selection {
    background-color: $ff-grey-50;
    border: 1px solid $ff-grey-200;
    border-radius: 0.5rem;
    overflow: hidden;
}

.mcp-selection--list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.mcp-selection--option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid $ff-grey-200;
    transition: background-color 0.15s ease;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: $ff-grey-100;
    }

    &.is-selected {
        background-color: $ff-indigo-50;
    }
}

.mcp-selection--radio {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    margin-top: 0.125rem;
    border: 2px solid $ff-grey-400;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s ease;

    &.is-selected {
        border-color: $ff-indigo-600;

        &::after {
            content: '';
            display: block;
            width: 0.4rem;
            height: 0.4rem;
            border-radius: 50%;
            background-color: $ff-indigo-600;
        }
    }
}

.mcp-selection--content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.mcp-selection--label {
    font-size: 0.875rem;
    font-weight: 500;
    color: $ff-grey-800;
}

.mcp-selection--description {
    font-size: 0.8125rem;
    color: $ff-grey-500;
}
</style>
