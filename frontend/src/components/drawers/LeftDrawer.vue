<template>
    <section id="left-drawer" data-el="left-drawer" :class="{active: leftDrawer.state}">
        <Transition type="transition" mode="in-out" name="fade" duration="3">
            <component :is="leftDrawer.component" v-if="leftDrawer.component" :key="mainNav.context" />
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
    watch: {
        '$route.meta.menu': {
            handler: function (menu) {
                switch (menu) {
                case 'context-back':
                    return this.setMainNavContext('back')
                default:
                    return this.setMainNavContext('team')
                }
            },
            immediate: true
        }
    },
    mounted () {
        this.setLeftDrawer(markRaw(MainNav))
    },
    methods: {
        ...mapActions('ux', ['setLeftDrawer', 'setMainNavContext'])
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
    transition: opacity .3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
