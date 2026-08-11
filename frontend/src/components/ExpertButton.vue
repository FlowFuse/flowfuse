<template>
    <div class="expert-button-wrapper flex items-center justify-center h-full px-3" style="height: 60px;">
        <div class="expert-composite" :class="{ 'expert-composite--mcp-active': mcpActive }">
            <button
                v-if="!isExpertDrawerOpen"
                class="expert-composite__expert flex items-center gap-1.5 justify-center px-[9px] py-[6px] font-bold text-[0.85rem] leading-[20px] text-gray-800 whitespace-nowrap transition-colors"
                data-el="expert-button"
                data-click-exclude="right-drawer"
                @click="onExpertClick"
            >
                <img src="/ff-minimal-red.svg" alt="FlowFuse" class="w-5 h-5 -ml-1 mr-0.5 shrink-0">
                <span>Expert</span>
            </button>
            <button
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

import { createTabPresencePublisher, destroyTabPresencePublisher } from '@/publishers/tab-presence.publisher'
import alerts from '@/services/alerts.js'
import getAppOrchestrator from '@/services/app.orchestrator'
import { useContextStore } from '@/stores/context.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

const MCP_TOGGLE_KEY = 'ff-mcp-active'

export default {
    name: 'ExpertButton',
    components: {
        McpIcon
    },
    data () {
        return {
            mcpActive: false,
            publisher: null
        }
    },
    computed: {
        ...mapState(useUxDrawersStore, ['rightDrawer']),
        ...mapState(useContextStore, ['team']),
        isExpertDrawerOpen () {
            return (this.rightDrawer.state || this.rightDrawer.fixed)
        }
    },
    mounted () {
        const stored = sessionStorage.getItem(MCP_TOGGLE_KEY)
        if (stored === 'true' && this.team) {
            this.startMcp()
        }
    },
    beforeUnmount () {
        if (this.publisher) {
            destroyTabPresencePublisher()
            this.publisher = null
        }
    },
    methods: {
        ...mapActions(useProductExpertStore, ['openAssistantDrawer']),
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
            const orchestrator = getAppOrchestrator()
            const { mqtt } = orchestrator.$services
            const { createMqttTransport } = require('@/transport/mqtt.transport')
            const transport = createMqttTransport(mqtt)

            this.publisher = createTabPresencePublisher({
                app: orchestrator.$app,
                router: orchestrator.$router,
                transport
            })
            this.publisher.connect(this.team)
            this.mcpActive = true
            sessionStorage.setItem(MCP_TOGGLE_KEY, 'true')
            alerts.emit('MCP session exposed. Third-party agents can now target this tab.', 'confirmation')
        },
        stopMcp () {
            if (this.publisher) {
                this.publisher.disconnect()
                destroyTabPresencePublisher()
                this.publisher = null
            }
            this.mcpActive = false
            sessionStorage.setItem(MCP_TOGGLE_KEY, 'false')
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

/* Composite wrapper: animated gradient border around both halves */
.expert-composite {
    display: inline-flex;
    background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                linear-gradient(135deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    border: 1px solid transparent;
    border-radius: 6px;
    animation: gradient-border-rotate 4s linear infinite;

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
    border-left: 1px solid rgba(128, 128, 128, 0.2);
    background: transparent;
    cursor: pointer;
    border-radius: 0 5px 5px 0;
    color: var(--ff-color-text-subtle);

    &:hover {
        background-color: var(--ff-color-bg-surface);
        color: var(--ff-color-text-default);
    }

    &--active {
        color: var(--ff-palette-green-600);

        &:hover {
            color: var(--ff-palette-green-700);
        }
    }
}

@keyframes gradient-border-rotate {
    0% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(0deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    10% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(36deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    20% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(72deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    30% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(108deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    40% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(144deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    50% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(180deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    60% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(216deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    70% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(252deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    80% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(288deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    90% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(324deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
    100% {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(360deg, var(--ff-palette-red-600), var(--ff-palette-indigo-600), var(--ff-palette-red-600)) border-box;
    }
}
</style>
