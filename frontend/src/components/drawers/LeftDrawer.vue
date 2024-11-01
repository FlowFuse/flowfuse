<template>
    <section id="left-drawer" data-el="left-drawer" :class="{active: leftDrawer.state}">
        <Transition type="transition" mode="out-in" name="fade">
            <component :is="leftDrawer.component" v-if="leftDrawer.component" :key="leftDrawer.component.name" />
        </Transition>
    </section>
</template>

<script>
import { markRaw } from 'vue'
import { mapActions, mapState } from 'vuex'

import MainNav from './navigation/MainNav.vue'

export default {
    name: 'LeftDrawer',
    computed: {
        ...mapState('ux', ['leftDrawer', 'mainNav'])
    },
    mounted () {
        this.setLeftDrawer(markRaw(MainNav))
    },
    methods: {
        ...mapActions('ux', ['setLeftDrawer'])
    }
}
</script>

<style scoped lang="scss">
#left-drawer {
    background: $ff-white; // todo replace with themed variables not colors
    border-right: 1px solid $ff-grey-300; // todo same as above ^
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity .1s ease-in;
}
</style>
