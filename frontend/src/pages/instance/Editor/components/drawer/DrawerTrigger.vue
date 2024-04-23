<template>
    <div class="drawer-trigger" @click="toggleDrawer">
        <img src="../../../../../images/icons/ff-logo--wordmark--grey.svg" alt="logo">
        <ChevronUpIcon class="ff-btn--icon close-drawer" />
    </div>
</template>

<script>
import { ChevronUpIcon } from '@heroicons/vue/solid'

export default {
    name: 'DrawerTrigger',
    components: { ChevronUpIcon }
}
</script>

<style scoped lang="scss">
.drawer-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  position: absolute;
  top: -40px;
  left: 50%;
  margin-left: -84px;
  padding: 10px 16px 8px;
  color: $ff-grey-400;
  background: white;
  border: 1px solid $ff-grey-400;
  box-shadow: 4px -4px 8px rgba(0, 0, 0, 0.10);
  border-radius: 10px 10px 0 0;
  transition: ease-out .7s;

  img {
    height: 20px;
  }

  .ff-btn--icon {
    color: $ff-grey-400
  }

  &:hover {
    cursor: pointer;
  }
}

.open {
  height: 320px;

  .drawer-trigger {
    top: 150vh;
    transition: ease-in .1s;
  }
}
</style>
