<template>
    <section id="left-drawer" data-el="left-drawer">
        <MainNavigation />
        <!--        todo replace hardcoded component to allow swapping with contextual menu-->
        <!--        <component :is="leftDrawer.component" v-if="leftDrawer.component" />-->
    </section>
</template>

<script>
import { mapState } from 'vuex'

import MainNavigation from './navigation/MainNavigation.vue'

export default {
    name: 'LeftDrawer',
    components: { MainNavigation },
    computed: {
        ...mapState('ux', ['leftDrawer'])
    }
}
</script>

<style scoped lang="scss">
#left-drawer {
    background: $ff-white; // todo replace with themed variables not colors
    border-right: 1px solid $ff-grey-300; // todo same as above ^
}
</style>
