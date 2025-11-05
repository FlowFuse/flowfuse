<template>
    <div class="expert-button-wrapper">
        <button class="expert-button" data-el="expert-button" data-click-exclude="right-drawer" @click="onClick">
            <SparklesIcon />
        </button>
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapActions, mapState } from 'vuex'

import ExpertDrawer from './drawers/expert/ExpertDrawer.vue'

export default {
    name: 'ExpertButton',
    components: { SparklesIcon },
    computed: {
        ...mapState('ux/drawers', ['rightDrawer'])
    },
    methods: {
        ...mapActions('ux/drawers', ['openRightDrawer', 'closeRightDrawer']),
        onClick () {
            this.openRightDrawer({ component: markRaw(ExpertDrawer) })
        }
    }
}
</script>

<style scoped lang="scss">
.expert-button-wrapper {

  .expert-button {
    color: $ff-grey-800;
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 18px;
    position: relative;

    > * {
      pointer-events: none;
    }

    svg {
      flex: 1;
      width: 24px;
      height: 24px;
      transition: ease-in-out .1s;
      object-fit: contain;
    }

    &:hover {
      svg {
        will-change: transform;
        color: $ff-indigo-600;
        transform: scale(1.25) translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
        stroke-width: 1.5px;
        shape-rendering: geometricPrecision;
        text-rendering: geometricPrecision;
      }
    }
  }
}
</style>
