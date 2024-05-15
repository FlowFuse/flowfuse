<template>
    <div class="resize-bar">
        <transition name="fade">
            <div v-if="isHandleVisible" class="resize-handle" :class="{shadowed: isHandleShadowed}">
                <span>...</span>
            </div>
        </transition>
    </div>
</template>

<script>
export default {
    name: 'ResizeBar',
    props: {
        isHandleVisible: {
            type: Boolean,
            default: true
        },
        isHandleShadowed: {
            type: Boolean,
            default: true
        }
    }
}
</script>

<style scoped lang="scss">
.resize-bar {
  position: relative;
  height: 6px;
  border-top: 1px solid $ff-grey-400;
  background: white;
  display: flex;
  justify-content: center;
  z-index: 15;

  .resize-handle {
    display: flex;
    justify-content: right;
    align-self: self-end;
    align-items: end;
    letter-spacing: 10px;
    width: 50px;
    height: 10px;
    background: $ff-grey-100;
    border: 1px solid $ff-grey-300;
    border-radius: 5px;
    color: $ff-grey-300;
    transition: ease-in-out 0.3s;

    &.shadowed {
      box-shadow: 0px -4px 10px rgba(0, 0, 0, 0.10);
    }
  }

  &:hover {
    cursor: ns-resize;

    .resize-handle {
      background: $ff-grey-200;
      color: $ff-grey-400;
    }
  }
}
</style>
