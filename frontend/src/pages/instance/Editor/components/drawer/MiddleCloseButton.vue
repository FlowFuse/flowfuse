<template>
    <transition name="slideIn">
        <div v-if="isVisible" class="drawer-close">
            <ChevronLeftIcon class="ff-btn--icon" />
        </div>
    </transition>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

export default {
    name: 'MiddleCloseButton',
    components: { ChevronLeftIcon },
    props: {
        isVisible: {
            type: Boolean,
            default: false
        }
    }
}
</script>

<style scoped lang="scss">

.drawer-close {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 0 5px 5px 0;
  width: 30px;
  height: 100px;
  top: 50%;
  right: -30px;
  margin-top: -50px;
  box-shadow: -4px 4px 8px rgba(0, 0, 0, 0.10);
  border: 1px solid var(--ff-grey-300);
  border-left: none;
  color: var(--ff-grey-400);

  &:hover {
    cursor: pointer;
  }
}

.slideIn-enter-active,
.slideIn-leave-active {
  transition: ease-in-out .1s;
}
.slideIn-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.slideIn-enter-to {
  opacity: 1;
}
.slideIn-leave-from {
  opacity: 1;
}
.slideIn-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
