<template>
    <div class="ff-expert-drawer" data-el="expert-drawer">
        <div class="header">
            <div class="flex content">
                <h2 class="title flex-grow">FlowFuse Expert</h2>
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

    .header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid $ff-grey-200;
        background: white;

        .content {
            display: flex;
            align-items: center;

            .title {
                font-size: 1.25rem;
                font-weight: 600;
                color: $ff-grey-800;
                margin: 0;
            }
        }
    }
}
</style>
