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
                // Targeting is not exclusive, so the count is the point: a user glancing at a
                // green plug should be able to tell one agent from several driving this page.
                return this.mcpClientCount === 1
                    ? '1 MCP client is targeting this tab. Click to disable'
                    : `${this.mcpClientCount} MCP clients are targeting this tab. Click to disable`
            case 'waiting':
                return 'Exposed to MCP clients. None are targeting this tab yet. Click to disable'
            case 'interrupted':
                // Deliberately does not say how many clients were targeting it: that number is
                // from before the link dropped and there is no way to know if it still holds.
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
            // itself - that generic notice plus the specific one below is the same event
            // reported twice. A team switch is the more useful of the two, so it wins.
            // Only the call that actually closed the session speaks, so the header's second
            // toggle cannot report the same switch again.
            if (await this.disableMcp()) {
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
            // Deliberately not a confirmation: nothing is targeting the tab yet, and the
            // toggle turning amber is the honest version of that.
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

/*
 * The gradient's angle is animated as a single registered property rather than by
 * redeclaring the whole background at each keyframe. Registering it is what makes it
 * interpolate at all - an unregistered custom property is a string, and animating one
 * snaps between keyframes instead of sweeping.
 */
@property --ff-expert-border-angle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 135deg;
}

/* Composite wrapper: animated gradient border around both halves */
.expert-composite {
    display: inline-flex;
    /*
     * Conic rather than linear. A rotating linear gradient sweeps a straight band across
     * the box, so every pass drags a hard edge over the corners; a conic one radiates from
     * the centre, which around a 1px border reads as a continuous hue rotation with no
     * edge to catch. Purple sits between the two brand colours in both directions, because
     * red to indigo taken directly passes through a muddy midpoint - the extra stops are
     * what make the ramp gradual instead of a seam that happens to be moving.
     */
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

    /*
     * The wave belongs to the whole button, not the MCP half. Tinting only that half put a
     * hard edge down the divider, which read as two controls rather than one thing in a
     * state. Living on the composite it runs edge to edge.
     *
     * Two independent layers of soft blobs drifting over each other. Deliberately not one
     * ramp scrolling in a straight line: a single direction at a constant rate reads as a
     * mechanical wipe, and you can see the beat. These have different durations, different
     * numbers of waypoints and different paths, so the two layers come back into the same
     * arrangement only every few minutes. What you notice is colour swelling and receding
     * in no particular direction, which is the point.
     *
     * inset:0 resolves against the padding box, so they fill inside the border without
     * covering the swirl. Their own border-radius clips them, rather than overflow:hidden,
     * which would cut the count badge's ring where that oversails the edge.
     */
    /*
     * Interrupted: this tab cannot reach the platform. The conic gradient goes entirely,
     * replaced by a flat red edge, and the swirl stops with it - a fault that keeps
     * animating like the healthy states reads as activity, and the whole signal here is
     * that nothing is flowing. There is no wave either, for the same reason: the states
     * that move are the ones where something is actually happening.
     */
    &--mcp-interrupted {
        background: linear-gradient(var(--ff-color-bg-app), var(--ff-color-bg-app)) padding-box,
                    linear-gradient(var(--ff-color-expert-fault-border), var(--ff-color-expert-fault-border)) border-box;
        animation: none;
    }

    &--mcp-connected {
        /*
         * The divider goes while the wave is running: a line down the middle cuts the drift
         * into two halves and gives the eye an edge to stop at, which is the one thing the
         * whole effect is trying to avoid. Colour rather than width, so the 1px stays in the
         * layout and nothing shifts as the state flips - and `transition-colors` on the
         * button means it fades rather than blinks out.
         */
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

/*
 * Right half: MCP toggle. Three states, because being exposed to agents and
 * being driven by one are different things:
 *   off       - subtle, nothing running
 *   waiting   - amber and pulsing, exposed but nothing is targeting this tab
 *   connected - steady green, at least one MCP client is driving it
 *
 * Position is for the count badge, which several clients at once makes possible.
 */
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

        /*
         * The pulse is on the glyph alone. Breathing the panel as well turns a quiet
         * status into something that pulls focus off the page behind it, and fading the
         * whole button would take the divider border with it.
         * Steady amber is a fine fallback - the colour already carries the state.
         */
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

    /*
     * Connected is the glyph and the count only. The tint that goes with it lives on the
     * composite, so it can run the full width instead of stopping at the divider.
     */
    &--connected {
        color: var(--ff-color-success);

        /* Only the glyph is pinned here. The hover veil is inherited from the base rule so
           the hovered half still lifts, and the wave still reads through it. */
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
    /*
     * The tint is translucent in the dark theme, so it needs an opaque fill underneath
     * or the plug icon reads straight through the badge sitting on top of it. That has
     * to be a colour plus an image layer: `background: <colour>, <colour>` is invalid
     * (only the last layer of the shorthand may carry a colour) and drops the whole
     * declaration, which renders the badge transparent.
     * The ring is what separates badge from icon - both are green, and without it they
     * merge into a single shape.
     */
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

/*
 * Four waypoints, eased, ending where it began. The eased segments are what stop it
 * reading as a constant drift: each blob slows as it turns and picks up again after.
 *
 * background-position places the image's top-left corner, so these are centre-minus-radius.
 * The button is about 34px tall and the blobs are 56-82px across, so every y is negative:
 * a blob only shows its middle if it hangs well above the box.
 */
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

/* Three waypoints against the other layer's four, on a different clock, so the pair does
   not fall back into step on any short cycle. */
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

/*
 * A full turn, stated explicitly at both ends. A `to`-only keyframe takes its start from
 * the property's initial-value, which made this sweep 135deg to 360deg - five eighths of a
 * revolution - and then snap back 135deg every cycle. Ending on 495deg rather than 360deg
 * is what closes the loop: 495 is 135 plus a whole turn, so the last frame renders
 * identically to the first, and the resting angle stays 135deg for anyone who never sees
 * the animation at all.
 */
@keyframes expert-border-swirl {
    from {
        --ff-expert-border-angle: 135deg;
    }
    to {
        --ff-expert-border-angle: 495deg;
    }
}
</style>
