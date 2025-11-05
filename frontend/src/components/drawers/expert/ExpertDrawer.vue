<template>
    <div class="ff-expert-drawer" data-el="expert-drawer">
        <div class="header">
            <div class="flex content">
                <h2 class="title flex-grow">FlowFuse Expert</h2>
            </div>
        </div>
        <div class="ff-expert">
            <div class="ff-expert__placeholder">
                <!-- Expert AI assistant content will go here -->
                <p>FlowFuse Expert Assistant</p>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ExpertDrawer',
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

    .ff-expert {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;

        &__placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: $ff-grey-500;
            text-align: center;

            p {
                font-size: 1rem;
            }
        }
    }
}
</style>
