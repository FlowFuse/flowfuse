<template>
    <section
        id="right-drawer"
        v-click-outside="{handler: closeDrawer, exclude: ['right-drawer']}"
        :class="{open: rightDrawer.state, wider: rightDrawer.wider}"
        data-el="right-drawer"
    >
        <component :is="rightDrawer.component" v-if="rightDrawer.component" v-bind="rightDrawer.props" />
    </section>
</template>

<script>
import { mapActions, mapState } from 'vuex'

export default {
    name: 'RightDrawer',
    computed: {
        ...mapState('ux', ['rightDrawer'])
    },
    methods: {
        ...mapActions('ux', ['closeRightDrawer']),
        closeDrawer () {
            if (this.rightDrawer.state) {
                this.closeRightDrawer()
            }
        }
    }

}
</script>

<style scoped lang="scss">
#right-drawer {
  position: absolute;
  border-left: 1px solid $ff-grey-300;
  background: white;
  height: calc(100% - 60px);
  top: 60px;
  right: -1000px;
  z-index: 120;
  width: 100%;
  max-width: 0;
  min-width: 0;
  transition: ease-in-out .3s;
  box-shadow: -5px 0px 8px rgba(0, 0, 0, 0.1);

  &.open {
    right: 0;
    width: 100%;
    max-width: 30vw;
    min-width: 400px;

    &.wider {
        max-width: 45vw;
    }
  }
}
</style>
