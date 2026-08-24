<template>
    <div v-if="showExpertButton || showMcpToggle" class="expert-button-wrapper flex items-center justify-center h-full px-3" style="height: 60px;">
        <div class="expert-composite" :class="{ 'expert-composite--mcp-active': mcpActive }">
            <button
                v-if="showExpertButton"
                class="expert-composite__expert flex items-center gap-1.5 justify-center px-[9px] py-[6px] font-bold text-[0.85rem] leading-[20px] text-gray-800 whitespace-nowrap transition-colors"
                data-el="expert-button"
                data-click-exclude="right-drawer"
                @click="onExpertClick"
            >
                <img src="/ff-minimal-red.svg" alt="FlowFuse" class="w-5 h-5 -ml-1 mr-0.5 shrink-0">
                <span>Expert</span>
            </button>
            <button
                v-if="showMcpToggle"
                v-ff-tooltip:bottom="mcpActive ? 'Disable MCP' : 'Enable MCP'"
                class="expert-composite__mcp flex items-center justify-center py-[6px] px-[7px] transition-colors"
                :class="{ 'expert-composite__mcp--active': mcpActive }"
                data-el="mcp-toggle"
                @click="onMcpClick"
            >
                <McpIcon class="w-4 h-4" />
            </button>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'

import McpIcon from './icons/McpIcon.js'

import alerts from '@/services/alerts.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useProductMcpStore } from '@/stores/product-mcp.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default {
    name: 'ExpertButton',
    components: {
        McpIcon
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useProductMcpStore, { mcpActive: 'active' }),
        ...mapState(useUxDrawersStore, ['rightDrawer']),
        ...mapState(useContextStore, ['team']),
        isExpertDrawerOpen () {
            return (this.rightDrawer.state || this.rightDrawer.fixed)
        },
        isAiEnabled () {
            return this.featuresCheck.isAiFeatureEnabled
        },
        showExpertButton () {
            return this.isAiEnabled && !this.isExpertDrawerOpen
        },
        showMcpToggle () {
            return this.isAiEnabled && this.featuresCheck.isMcpThirdPartyFeatureEnabled
        }
    },
    watch: {
        team () {
            if (this.mcpActive) {
                this.stopMcp()
                alerts.emit('MCP session closed due to team switch.', 'info')
            }
        }
    },
    mounted () {
        // the flag survives a reload, the comms do not - bring them back up
        if (this.mcpActive && this.team) {
            this.enableMcp(this.team)
        }
    },
    beforeUnmount () {
        if (this.mcpActive) {
            this.teardownMcp()
        }
    },
    methods: {
        ...mapActions(useProductExpertStore, ['openAssistantDrawer']),
        ...mapActions(useProductMcpStore, { enableMcp: 'enable', disableMcp: 'disable', teardownMcp: 'teardown' }),
        onExpertClick () {
            this.openAssistantDrawer({ openPinned: this.rightDrawer.expertState.pinned })
        },
        onMcpClick () {
            if (this.mcpActive) {
                this.stopMcp()
            } else {
                this.startMcp()
            }
        },
        startMcp () {
            if (!this.team) return
            this.enableMcp(this.team)
            alerts.emit('MCP session exposed. Third-party agents can now target this tab.', 'confirmation')
        },
        stopMcp () {
            this.disableMcp()
            alerts.emit('MCP session closed.', 'info')
        }
    }
}
</script>

<style scoped lang="scss">
/* Hide the ::after divider that the header navigation adds to all children */
.expert-button-wrapper::after {
    display: none !important;
}

/*
 * Composite wrapper: animated gradient border around both halves.
 * The angle lives in a registered custom property so the browser can
 * interpolate it - animating a gradient itself only steps between keyframes.
 */
@property --ff-expert-border-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

.expert-composite {
    --ff-expert-border-angle: 0deg;

    display: inline-flex;
    background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                conic-gradient(from var(--ff-expert-border-angle), var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    border: 1px solid transparent;
    border-radius: 6px;
    animation: expert-border-swirl 4s linear infinite;

    &:hover {
        border: 2px solid transparent;
        margin: -1px;
    }
}

/* Left half: Expert action */
.expert-composite__expert {
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 5px 0 0 5px;

    &:hover {
        background-color: var(--ff-color-bg-surface);
    }
}

/* Right half: MCP toggle */
.expert-composite__mcp {
    border: none;
    border-left: 1px solid var(--ff-color-border);
    background: transparent;
    cursor: pointer;
    border-radius: 0 5px 5px 0;
    color: var(--ff-color-text-subtle);

    &:hover {
        background-color: var(--ff-color-bg-surface);
        color: var(--ff-color-text-default);
    }

    &--active {
        color: var(--ff-color-success);

        &:hover {
            color: var(--ff-color-success);
        }
    }
}

@keyframes expert-border-swirl {
    to {
        --ff-expert-border-angle: 360deg;
    }
}
</style>
