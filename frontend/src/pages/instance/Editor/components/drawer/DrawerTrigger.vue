<template>
    <div class="drawer-trigger" @click="toggleDrawer">
        <img src="../../../../../images/icons/ff-logo--wordmark--grey.svg" alt="logo">
        <ChevronRightIcon class="ff-btn--icon close-drawer" />
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/solid'

export default {
    name: 'DrawerTrigger',
    components: { ChevronRightIcon }
}
</script>

<style scoped lang="scss">
.drawer-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  position: absolute;
  top: 50%;
  right: -40px;
  margin-top: -42px;
  padding: 16px 8px 10px;
  color: $ff-grey-400;
  background: white;
  border: 1px solid $ff-grey-400;
  box-shadow: -4px 4px 8px rgba(0, 0, 0, 0.10);
  border-radius: 0 10px 10px 0;
  transition: ease-out .7s;

  img {
    height: 20px;
    transform: rotate(90deg);
  }

  .ff-btn--icon {
    color: $ff-grey-400
  }

  &:hover {
    cursor: pointer;
  }
}

.open {
  width: 400px;

  .drawer-trigger {
    right: 150vw;
    transition: ease-in .1s;
  }
}
</style>
