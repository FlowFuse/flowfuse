<template>
    <div ref="container" class="tool-permissions-selector">
        <button
            class="tool-permissions-btn"
            :class="{ active: isOpen }"
            title="Tool Permissions"
            @click="toggleDropdown"
        >
            <ShieldCheckIcon class="ff-icon" />
        </button>

        <div v-if="isOpen" class="tool-permissions-dropdown" data-click-exclude="right-drawer">
            <div class="dropdown-header">
                <h4>Tool Permissions</h4>
            </div>

            <div class="default-policy">
                <label class="policy-label">Default policy</label>
                <div class="policy-options">
                    <button
                        v-for="option in policyOptions"
                        :key="option.value"
                        class="policy-btn"
                        :class="{ selected: defaultPolicy === option.value }"
                        @click="setDefaultPolicy(option.value)"
                    >
                        {{ option.label }}
                    </button>
                </div>
            </div>

            <div v-if="toolList.length > 0" class="tools-section">
                <label class="policy-label">Per-tool overrides</label>
                <div class="tool-list">
                    <div
                        v-for="tool in toolList"
                        :key="tool.name"
                        class="tool-row"
                    >
                        <div class="tool-info">
                            <span class="tool-name" :title="tool.description">
                                {{ formatToolName(tool.name) }}
                            </span>
                            <span v-if="tool.readOnly" class="tool-badge read-only">read</span>
                            <span v-else class="tool-badge write">write</span>
                        </div>
                        <div class="policy-options compact">
                            <button
                                v-for="option in policyOptions"
                                :key="option.value"
                                class="policy-btn small"
                                :class="{
                                    selected: getToolPolicy(tool.name) === option.value,
                                    'is-override': isOverridden(tool.name)
                                }"
                                :title="option.label"
                                @click="setToolPolicy(tool.name, option.value)"
                            >
                                {{ option.short }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="empty-state">
                No platform tools available. Restart FlowFuse if you recently enabled expert insights.
            </div>
        </div>
    </div>
</template>

<script>
import { ShieldCheckIcon } from '@heroicons/vue/20/solid'
import { mapState } from 'pinia'

import { useMCPToolPermissionsStore } from '@/stores/mcp-tool-permissions.js'
import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'ToolPermissionsSelector',
    components: {
        ShieldCheckIcon
    },
    data () {
        return {
            isOpen: false,
            policyOptions: [
                { value: 'allow', label: 'Always allow', short: 'Allow' },
                { value: 'prompt', label: 'Ask each time', short: 'Ask' },
                { value: 'deny', label: 'Always deny', short: 'Deny' }
            ]
        }
    },
    computed: {
        ...mapState(useProductExpertStore, ['platformTools']),
        defaultPolicy () {
            return useMCPToolPermissionsStore().defaultPolicy
        },
        toolList () {
            return (this.platformTools || []).map(t => ({
                name: t.name,
                description: t.description,
                readOnly: t.annotations?.readOnlyHint === true
            }))
        }
    },
    mounted () {
        document.addEventListener('click', this.handleClickOutside)
    },
    beforeUnmount () {
        document.removeEventListener('click', this.handleClickOutside)
    },
    methods: {
        toggleDropdown () {
            this.isOpen = !this.isOpen
        },
        handleClickOutside (e) {
            if (this.isOpen && this.$refs.container && !this.$refs.container.contains(e.target)) {
                this.isOpen = false
            }
        },
        formatToolName (name) {
            return name.replace('platform.', '').replace(/[-_]/g, ' ')
        },
        getToolPolicy (toolName) {
            return useMCPToolPermissionsStore().getPolicy(toolName)
        },
        isOverridden (toolName) {
            const store = useMCPToolPermissionsStore()
            return store.allowlist.includes(toolName) || store.denylist.includes(toolName)
        },
        setDefaultPolicy (policy) {
            useMCPToolPermissionsStore().setDefaultPolicy(policy)
        },
        setToolPolicy (toolName, policy) {
            const store = useMCPToolPermissionsStore()
            const currentPolicy = this.getToolPolicy(toolName)

            if (currentPolicy === policy) {
                store.removeFromAllowlist(toolName)
                store.removeFromDenylist(toolName)
                return
            }

            if (policy === 'allow') {
                store.addToAllowlist(toolName)
            } else if (policy === 'deny') {
                store.addToDenylist(toolName)
            } else {
                store.removeFromAllowlist(toolName)
                store.removeFromDenylist(toolName)
            }
        }
    }
}
</script>

<style scoped lang="scss">
.tool-permissions-selector {
    position: relative;
}

.tool-permissions-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #c7d2fe;
    border-radius: 5px;
    padding: 0.25rem 0.50rem;
    background: white;
    color: #1f2937;
    cursor: pointer;
    transition: background-color 0.15s ease;

    .ff-icon {
        width: 1.25rem;
        height: 1.25rem;
    }

    &:hover {
        background-color: #f9fafb;
    }

    &.active {
        background: $ff-indigo-600;
        border-color: $ff-indigo-600;
        color: white;
    }
}

.tool-permissions-dropdown {
    position: absolute;
    bottom: calc(100% + 0.5rem);
    right: 0;
    width: 320px;
    max-height: 400px;
    overflow-y: auto;
    background: white;
    border: 1px solid $ff-grey-200;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
    z-index: 50;
    padding: 0.75rem;
}

.dropdown-header {
    margin-bottom: 0.75rem;

    h4 {
        font-size: 0.875rem;
        font-weight: 600;
        color: $ff-grey-800;
        margin: 0;
    }
}

.policy-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: $ff-grey-500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.375rem;
}

.default-policy {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid $ff-grey-200;
    margin-bottom: 0.75rem;
}

.policy-options {
    display: flex;
    gap: 0.25rem;

    &.compact {
        flex-shrink: 0;
    }
}

.policy-btn {
    flex: 1;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid $ff-grey-300;
    border-radius: 4px;
    background: white;
    color: $ff-grey-600;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover {
        background: $ff-grey-50;
    }

    &.selected {
        background: $ff-indigo-600;
        border-color: $ff-indigo-600;
        color: white;
    }

    &.small {
        padding: 0.125rem 0.375rem;
        font-size: 0.6875rem;
    }
}

.tools-section {
    .tool-list {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
    }
}

.tool-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.25rem 0;
}

.tool-info {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    flex: 1;
}

.tool-name {
    font-size: 0.8125rem;
    color: $ff-grey-800;
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tool-badge {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.0625rem 0.3125rem;
    border-radius: 9999px;
    flex-shrink: 0;

    &.read-only {
        background-color: #dbeafe;
        color: #1e40af;
    }

    &.write {
        background-color: #fef3c7;
        color: #92400e;
    }
}

.empty-state {
    font-size: 0.8125rem;
    color: $ff-grey-500;
    text-align: center;
    padding: 1rem 0;
}
</style>
