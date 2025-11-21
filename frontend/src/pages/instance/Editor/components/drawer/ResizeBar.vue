<template>
    <div class="resize-bar" />
</template>

<script>
export default {
    name: 'ResizeBar'
}
</script>

<style scoped lang="scss">
.resize-bar {
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  border-right: 1px solid var(--ff-grey-400);
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
    color: var(--ff-grey-50)0;
  }

  &:hover {
    cursor: ew-resize;

    &::before {
      color: var(--ff-grey-700);
    }
  }
}
</style>
