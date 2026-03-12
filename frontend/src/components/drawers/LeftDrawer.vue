<template>
    <section
        id="left-drawer"
        v-click-outside="{handler: handleClickOutside, exclude: ['left-drawer']}"
        data-el="left-drawer"
        :class="{active: leftDrawer.state}"
    >
        <Transition type="transition" mode="out-in" name="fade">
            <component :is="leftDrawer.component" v-if="leftDrawer.component" :key="leftDrawer.component.name" />
        </Transition>
    </section>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import { markRaw } from 'vue'

import MainNav from './navigation/MainNav.vue'

import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default {
    name: 'LeftDrawer',
    computed: {
        ...mapState(useUxDrawersStore, ['leftDrawer'])
    },
    mounted () {
        this.setLeftDrawer(markRaw(MainNav))
    },
    methods: {
        ...mapActions(useUxDrawersStore, ['setLeftDrawer', 'closeLeftDrawer']),
        handleClickOutside () {
            this.$nextTick(() => this.closeLeftDrawer)
        }
    }
}
</script>

<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
    transition: opacity .1s ease-in;
}
</style>
