<template>
    <button
        title="Toggle drawer"
        class="drawer-trigger"
        :class="{ 'hidden': isHidden }"
        :aria-label="isHidden ? 'Open drawer' : 'Close drawer'"
        :aria-expanded="!isHidden"
        type="button"
        @click="$emit('toggle')"
    >
        <img src="../../images/icons/ff-minimal-grey.svg" alt="FlowFuse logo">
        <ChevronRightIcon class="ff-btn--icon" />
    </button>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/outline'

export default {
    name: 'DrawerTrigger',
    components: {
        ChevronRightIcon
    },
    props: {
        isHidden: {
            type: Boolean,
            default: false
        }
    },
    emits: ['toggle']
}
</script>

<style scoped lang="scss">
.drawer-trigger {
    display: flex;
    align-items: center;
    gap: 1px;
    position: fixed;
    top: 10px;
    left: 0;
    z-index: 100;
    padding: 8px 2px 8px 8px;

    /* Colors - matching original drawer trigger */
    color: $ff-grey-400;
    background: $ff-white;
    border: 1px solid $ff-grey-400;
    border-left: none;

    /* Reset button styles */
    font: inherit;

    /* Visual effects */
    box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.10);
    border-radius: 0 10px 10px 0;

    /* Animation */
    transform: translateX(0);
    transition: transform ease-in-out 0.3s;

    img {
        height: 20px;
    }

    .ff-btn--icon {
        color: $ff-grey-400;
        width: 20px;
        height: 20px;
    }

    &.hidden {
        // Move completely off-screen: own width (100%) + extra margin (20px)
        transform: translateX(calc(-100% - 20px));
    }

    &:hover {
        cursor: pointer;
    }
}
</style>
