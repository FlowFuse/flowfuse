<template>
    <div class="resize-bar" :class="{horizontal: isHorizontal, resizing: isResizing}" />
</template>

<script>
export default {
    name: 'ResizeBar',
    props: {
        direction: {
            type: String,
            default: 'vertical' // vertical || horizontal
        },
        isResizing: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        isHorizontal () {
            return this.direction === 'horizontal'
        }
    }
}
</script>

<style scoped lang="scss">
.resize-bar {
    position: absolute;
    right: 0;
    top: 0;
    width: 6px;
    height: 100%;
    border-right: 1px solid $ff-grey-400;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 15;

    &::before {
        content: '...';
        position: relative;
        left: 3px;
        writing-mode: vertical-rl;
        line-height: 0.5;
        letter-spacing: 4px;
        color: $ff-grey-500;
    }

    &:hover {
        cursor: ew-resize;

        &::before {
            color: $ff-grey-700;
        }
    }

    &.horizontal {
        width: 100%;
        height: 6px;

        &::before {
            writing-mode: horizontal-tb;
        }

        &:hover {
            cursor: ns-resize;
        }
    }
}
</style>
