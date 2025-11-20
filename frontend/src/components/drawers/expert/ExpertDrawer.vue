<template>
    <div class="ff-expert-drawer" data-el="expert-drawer">
        <div class="header">
            <div class="flex items-center gap-1">
                <div class="logo-container">
                    <img src="/ff-logo--wordmark--light.svg" alt="FlowFuse" class="logo">
                </div>
                <h2 class="title">Expert</h2>
            </div>
            <div class="header-actions">
                <button
                    class="header-button pin-button"
                    :class="{ 'is-pinned': isPinned }"
                    :title="isPinned ? 'Unpin drawer' : 'Pin drawer open'"
                    data-el="expert-drawer-pin-button"
                    @click="togglePin"
                >
                    <LockClosedIcon v-if="isPinned" class="ff-icon" />
                    <LockOpenIcon v-else class="ff-icon" />
                </button>
                <button
                    class="header-button"
                    :title="'Close Expert'"
                    data-el="expert-drawer-close-button"
                    @click="closeDrawer"
                >
                    <XIcon class="ff-icon" />
                </button>
            </div>
        </div>
        <ExpertPanel />
    </div>
</template>

<script>
import { LockClosedIcon, LockOpenIcon, XIcon } from '@heroicons/vue/solid'
import { mapActions, mapState } from 'vuex'

import ExpertPanel from '../../expert/Expert.vue'

export default {
    name: 'ExpertDrawer',
    components: {
        ExpertPanel,
        XIcon,
        LockClosedIcon,
        LockOpenIcon
    },
    inject: ['togglePinWithWidth'],
    data () {
        return {
            // Future: Add expert state here
        }
    },
    computed: {
        ...mapState('ux/drawers', ['rightDrawer']),
        isPinned () {
            return this.rightDrawer.fixed
        }
    },
    mounted () {
        // Future: Listen for custom events
        // Example: document.addEventListener('expert:open', this.handleOpenEvent)
    },
    beforeUnmount () {
        // Future: Clean up event listeners
        // Example: document.removeEventListener('expert:open', this.handleOpenEvent)
    },
    methods: {
        ...mapActions('ux/drawers', ['closeRightDrawer']),
        closeDrawer () {
            this.closeRightDrawer()
        },
        togglePin () {
            this.togglePinWithWidth()
        }
        // Future: Handle event-based triggers
        // handleOpenEvent(event) {
        //     const context = event.detail
        //     // Process context and update expert state
        // }
    }
}
</script>

<style lang="scss" scoped>
.ff-expert-drawer {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden; // Prevent drawer from scrolling

    .header {
        padding: 1rem 1.5rem;
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(90deg, $ff-red-600, #5048e5, $ff-red-600, #5048e5, $ff-red-600) border-box;
        border: none;
        border-bottom: 1px solid transparent;
        background-size: 200% 100%;
        animation: gradient-flow-lr 4s linear infinite;
        flex-shrink: 0; // Prevent header from shrinking
        display: flex;
        align-items: center;
        justify-content: space-between;

        .flex {
            display: flex;

            &.items-center {
                align-items: center;
            }

            &.gap-1 {
                gap: 0.25rem; // gap-1
            }
        }

        .logo-container {
            width: 6rem; // w-24
            height: 1.5rem; // h-6
            display: flex;
            align-items: center;

            .logo {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
        }

        .title {
            font-size: 1rem; // text-base
            font-weight: 600; // font-semibold
            color: #374151; // text-gray-700
            margin: 0;
            line-height: 1.5rem; // Match logo height for proper alignment
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 0.25rem;

            .header-button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
                padding: 0;
                background: none;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                color: inherit;
                font: inherit;
                transition: background-color 0.15s ease;

                &:hover {
                    cursor: pointer;
                    background: $ff-grey-100;
                }

                &.pin-button.is-pinned {
                    background: $ff-indigo-800;
                    color: white;

                    &:hover {
                        background: $ff-indigo-900;
                    }
                }
            }
        }
    }

    // Ensure ExpertPanel fills remaining space
    > * {
        &:not(.header) {
            flex: 1;
            min-height: 0; // Important for flex child overflow
        }
    }
}

@keyframes gradient-flow-lr {
    0% {
        background-position: 0% 0%;
    }
    100% {
        background-position: 100% 0%;
    }
}
</style>
