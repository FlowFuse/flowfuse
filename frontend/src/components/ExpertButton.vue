<template>
    <div v-if="showExpertButton || showMcpToggle" class="expert-button-wrapper flex items-center justify-center h-full px-3" style="height: 60px;">
        <div class="expert-composite" :class="[`expert-composite--mcp-${mcpStatus}`]">
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
                v-ff-tooltip:bottom="mcpTooltip"
                class="expert-composite__mcp flex items-center justify-center py-[6px] px-[7px] transition-colors"
                :class="`expert-composite__mcp--${mcpStatus}`"
                :data-mcp-status="mcpStatus"
                data-el="mcp-toggle"
                @click="onMcpClick"
            >
                <McpIcon class="w-4 h-4" />
                <span v-if="mcpStatus === 'connected' && mcpClientCount > 1" class="expert-composite__mcp-count" data-el="mcp-client-count">{{ mcpClientCount }}</span>
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
        ...mapState(useProductMcpStore, { mcpActive: 'active', mcpStatus: 'status', mcpClientCount: 'clientCount' }),
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
        },
        mcpTooltip () {
            switch (this.mcpStatus) {
            case 'connected':
                // Targeting is not exclusive, so the count is the point
                return this.mcpClientCount === 1
                    ? '1 MCP client is targeting this tab. Click to disable'
                    : `${this.mcpClientCount} MCP clients are targeting this tab. Click to disable`
            case 'waiting':
                return 'Exposed to MCP clients. None are targeting this tab yet. Click to disable'
            case 'interrupted':
                // No count: that number predates the drop and may no longer hold
                return 'Connection to FlowFuse lost. This tab cannot be reached by MCP clients until it reconnects'
            default:
                return 'Enable MCP'
            }
        }
    },
    watch: {
        async team () {
            if (!this.mcpActive) {
                return
            }
            // Straight to the store action rather than stopMcp(), which announces the close
            // itself - the generic notice plus the specific one below is one event reported
            // twice. Only the call that actually closed it speaks, so the second toggle
            // cannot report the same switch again.
            if (await this.disableMcp()) {
                alerts.emit('MCP session closed due to team switch.', 'info')
            }
        }
    },
    mounted () {
        // The flag survives a reload, the comms do not. Counted rather than per instance:
        // the header mounts two, and only the last to leave should take the comms down.
        this.retainMcp(this.team)
    },
    beforeUnmount () {
        this.releaseMcp()
    },
    methods: {
        ...mapActions(useProductExpertStore, ['openAssistantDrawer']),
        ...mapActions(useProductMcpStore, { enableMcp: 'enable', disableMcp: 'disable', retainMcp: 'retain', releaseMcp: 'release' }),
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
            // Not a confirmation: nothing is targeting it yet, which is what the amber says
            alerts.emit('MCP session exposed. Third-party agents can now target this tab.', 'info')
        },
        async stopMcp () {
            if (await this.disableMcp()) {
                alerts.emit('MCP session closed.', 'info')
            }
        }
    }
}
</script>

<style scoped lang="scss">
/* Hide the ::after divider that the header navigation adds to all children */
.expert-button-wrapper::after {
    display: none !important;
}

@property --ff-expert-border-angle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 135deg;
}

/* Composite wrapper: animated gradient border around both halves */
.expert-composite {
    display: inline-flex;
    position: relative;
    background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                conic-gradient(from var(--ff-expert-border-angle),
                    var(--ff-palette-red-600),
                    var(--ff-palette-purple-600),
                    var(--ff-palette-indigo-600),
                    var(--ff-palette-purple-600),
                    var(--ff-palette-red-600)) border-box;
    border: 1px solid transparent;
    border-radius: 6px;

    @media (prefers-reduced-motion: no-preference) {
        /* Slower than the old sweep: with the edges gone there is nothing to track, so the
           rotation only has to be perceptible rather than legible. */
        animation: expert-border-swirl 9s linear infinite;
    }

    &:hover {
        border: 2px solid transparent;
        margin: -1px;
    }

    &--mcp-interrupted {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(var(--ff-color-expert-fault-border), var(--ff-color-expert-fault-border)) border-box;
        animation: none;
    }

    &--mcp-connected {
        .expert-composite__mcp {
            border-left-color: transparent;
        }

        &::before,
        &::after {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 0;
            border-radius: 5px;
            pointer-events: none;
            background-repeat: no-repeat;
        }

        /* Static fallback: the same hues, held still. Reduced motion should cost the
           movement, not the signal. */
        &::after {
            background-image: linear-gradient(135deg,
                var(--ff-color-expert-wave-1),
                var(--ff-color-expert-wave-2),
                var(--ff-color-expert-wave-3));
        }

        @media (prefers-reduced-motion: no-preference) {
            &::before {
                /* A held core out to 38%, then a long fade. Colour straight to transparent
                   from the centre peaks at a single point and averages out to nothing over
                   a blob this size. */
                background-image:
                    radial-gradient(closest-side circle, var(--ff-color-expert-wave-1), var(--ff-color-expert-wave-1) 38%, transparent),
                    radial-gradient(closest-side circle, var(--ff-color-expert-wave-3), var(--ff-color-expert-wave-3) 38%, transparent);
                background-size: 82px 82px, 64px 64px;
                animation: expert-splash-a 13s ease-in-out infinite;
            }

            &::after {
                background-image:
                    radial-gradient(closest-side circle, var(--ff-color-expert-wave-2), var(--ff-color-expert-wave-2) 38%, transparent),
                    radial-gradient(closest-side circle, var(--ff-color-expert-wave-1), var(--ff-color-expert-wave-1) 38%, transparent);
                background-size: 72px 72px, 56px 56px;
                animation: expert-splash-b 19s ease-in-out infinite;
            }
        }
    }
}

/* Both halves sit above the wave: it is a tint behind the button, not over it */
.expert-composite__expert,
.expert-composite__mcp {
    position: relative;
    z-index: 1;
}

/* Left half: Expert action */
.expert-composite__expert {
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 5px 0 0 5px;

    &:hover {
        background-color: var(--ff-color-expert-hover-veil);
    }
}

.expert-composite__mcp {
    position: relative;
    border: none;
    border-left: 1px solid var(--ff-color-border);
    background: transparent;
    cursor: pointer;
    border-radius: 0 5px 5px 0;
    /* Switched off, not merely quiet - it should recede until the user turns it on */
    color: var(--ff-color-status-idle-dot);

    &:hover {
        background-color: var(--ff-color-expert-hover-veil);
        color: var(--ff-color-text-default);
    }

    &--waiting {
        /* The -dot token, not -text: this is a standalone indicator, not text on a tinted pill */
        color: var(--ff-color-status-warning-dot);

        &:hover {
            color: var(--ff-color-status-warning-dot);
        }

        @media (prefers-reduced-motion: no-preference) {
            svg {
                animation: mcp-waiting-pulse 1.6s ease-in-out infinite;
            }
        }
    }

    /* Interrupted: the glyph goes red with the border, so the two halves agree */
    &--interrupted {
        color: var(--ff-color-expert-fault-glyph);

        &:hover {
            color: var(--ff-color-expert-fault-glyph);
        }
    }

    &--connected {
        color: var(--ff-color-success);

        &:hover {
            color: var(--ff-color-success);
        }
    }

    /* Above the composite's wave, so the tint never washes over the glyph or the count */
    svg {
        position: relative;
        z-index: 1;
    }
}

/*
 * Count badge, shown from two clients upwards. Sits on the icon corner rather than
 * beside it so the toggle keeps its width as the count changes.
 */
.expert-composite__mcp-count {
    position: absolute;
    top: 0;
    right: -1px;
    min-width: 14px;
    padding: 0 3px;
    border-radius: 999px;
    background-color: var(--ff-color-bg-app);
    background-image: linear-gradient(var(--ff-color-status-success-bg), var(--ff-color-status-success-bg));
    box-shadow: 0 0 0 1.5px var(--ff-color-bg-app);
    /* The -text token, not -success: this is text on a tinted pill, and it is small enough
       that the readable pairing matters more than matching the icon's green exactly. */
    color: var(--ff-color-status-success-text);
    font-size: 10px;
    font-weight: 700;
    line-height: 14px;
    text-align: center;
    pointer-events: none;
    z-index: 2;
}

@keyframes expert-splash-a {
    0%, 100% {
        background-position: -46px -34px, 86px -6px;
    }
    25% {
        background-position: 10px -12px, 40px -26px;
    }
    50% {
        background-position: 62px -30px, -30px -8px;
    }
    75% {
        background-position: 24px -6px, 74px -22px;
    }
}

@keyframes expert-splash-b {
    0%, 100% {
        background-position: 48px -8px, -18px -22px;
    }
    33% {
        background-position: -24px -28px, 66px -4px;
    }
    66% {
        background-position: 80px -14px, 26px -20px;
    }
}

@keyframes mcp-waiting-pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.45;
    }
}

@keyframes expert-border-swirl {
    from {
        --ff-expert-border-angle: 135deg;
    }
    to {
        --ff-expert-border-angle: 495deg;
    }
}
</style>
