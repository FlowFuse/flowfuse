<template>
    <div class="ff-expert-drawer" data-el="expert-drawer">
        <div class="header">
            <div class="flex items-center gap-1">
                <div class="logo-container">
                    <img src="/ff-logo--wordmark--light.svg" alt="FlowFuse" class="logo">
                </div>
                <h2 class="title">Expert Assistant</h2>
            </div>
        </div>
        <ExpertPanel />
    </div>
</template>

<script>
import ExpertPanel from '../../expert/Expert.vue'

export default {
    name: 'ExpertDrawer',
    components: {
        ExpertPanel
    },
    data () {
        return {
            // Future: Add expert state here
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
        border-bottom: 1px solid $ff-grey-200;
        background: white;
        flex-shrink: 0; // Prevent header from shrinking

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
    }

    // Ensure ExpertPanel fills remaining space
    > * {
        &:not(.header) {
            flex: 1;
            min-height: 0; // Important for flex child overflow
        }
    }
}
</style>
