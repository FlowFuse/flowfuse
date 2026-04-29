<template>
    <div class="ff-layout--platform" :class="{ 'ff-layout--platform--fullscreen': fullscreen }">
        <PageHeader v-show="!fullscreen" />

        <div class="ff-layout--platform--wrapper">
            <section v-if="!isImmersiveEditor" id="left-drawer" :class="{active: mainNav.mobileOpen}" data-el="left-drawer">
                <MainNav />
            </section>

            <div class="ff-view">
                <div id="platform-banner" />
                <slot />
            </div>

            <Drawer v-if="!isImmersiveEditor" />

            <PlatformAlerts />

            <interview-popup v-if="interview?.enabled" :flag="interview.flag" :payload="interview.payload" />

            <PlatformDialog />
            <transition name="page-fade">
                <div v-if="overlay" class="ff-dialog-container !z-[100]" />
            </transition>
        </div>
    </div>
</template>

<script>
import { mapState } from 'pinia'

import InterviewPopup from '../components/InterviewPopup.vue'
import PageHeader from '../components/PageHeader.vue'
import PlatformAlerts from '../components/PlatformAlerts.vue'
import PlatformDialog from '../components/dialogs/PlatformDialog.vue'
import Drawer from '../components/drawers/Drawer.vue'
import MainNav from '../components/drawers/navigation/MainNav.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useProductBrokersStore } from '@/stores/product-brokers.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'
import { useUxNavigationStore } from '@/stores/ux-navigation.js'
import { useUxStore } from '@/stores/ux.js'

export default {
    name: 'ff-layout-platform',
    components: {
        Drawer,
        MainNav,
        PageHeader,
        PlatformAlerts,
        PlatformDialog,
        InterviewPopup
    },
    computed: {
        ...mapState(useUxStore, ['overlay']),
        ...mapState(useUxDrawersStore, ['drawer']),
        ...mapState(useProductBrokersStore, ['interview']),
        ...mapState(useAccountSettingsStore, ['hasAvailableTeams']),
        ...mapState(useContextStore, ['isImmersiveEditor']),
        ...mapState(useUxNavigationStore, ['mainNav']),
        fullscreen () {
            return this.isImmersiveEditor && this.drawer.expertState.fullscreen
        }
    },
    watch: {
        $route: function () {
            this.checkRouteMeta()
        }
    },
    mounted () {
        this.checkRouteMeta()
    },
    methods: {
        checkRouteMeta () {
            for (let l = 0; l < this.$route.matched.length; l++) {
                const level = this.$route.matched[l]
                if (level.meta.hideSideMenu) {
                    this.hideTeamOptions = true
                    break
                }
            }
        }
    }
}
</script>

<style lang="scss">
.ff-layout--platform--fullscreen {
    .ff-layout--platform--wrapper {
        padding-top: 0;
    }
}
</style>
