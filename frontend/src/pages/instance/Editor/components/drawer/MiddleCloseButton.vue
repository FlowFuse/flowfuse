<template>
    <transition name="slideIn">
        <div v-if="isVisible" class="drawer-close">
            <ChevronDownIcon class="ff-btn--icon" />
        </div>
    </transition>
</template>

<script>
import { ChevronDownIcon } from '@heroicons/vue/solid'

export default {
    name: 'MiddleCloseButton',
    components: { ChevronDownIcon },
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
  border-radius: 5px 5px 0 0;
  width: 100px;
  height: 30px;
  top: -30px;
  left: 50%;
  margin-left: -50px;
  box-shadow: 4px -4px 8px rgba(0, 0, 0, 0.10);
  border: 1px solid $ff-grey-300;
  border-bottom: none;
  color: $ff-grey-400;

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
  transform: translateY(100%);
}
.slideIn-enter-to {
  opacity: 1;
}
.slideIn-leave-from {
  opacity: 1;
}
.slideIn-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
