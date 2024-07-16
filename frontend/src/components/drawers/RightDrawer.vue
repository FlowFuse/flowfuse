<template>
    <div v-click-outside="closeRightDrawer" class="right-drawer" :class="{open: rightDrawer.state} ">
        <component :is="rightDrawer.component" v-if="rightDrawer.component" />
    </div>
</template>

<script>
import { mapActions, mapState } from 'vuex'

export default {
    name: 'RightDrawer',
    computed: {
        ...mapState('ux', ['rightDrawer'])
    },
    methods: {
        ...mapActions('ux', ['closeRightDrawer'])
    }
}
</script>

<style scoped lang="scss">
.right-drawer {
  position: absolute;
  border-left: 1px solid $ff-grey-300;
  background: white;
  height: 100%;
  width: 0;
  right: -1000px;
  z-index: 500;
  transition: ease-in-out .3s;

  &.open {
    right: 0;
    width: 40%;
  }
}
</style>
