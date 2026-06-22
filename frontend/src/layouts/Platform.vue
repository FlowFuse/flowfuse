<template>
    <div class="ff-layout--platform">
        <PageHeader />

        <div class="ff-layout--platform--wrapper">
            <LeftDrawer />

            <div class="ff-view">
                <div id="platform-banner" />
                <slot />
            </div>

            <RightDrawer />

            <PlatformAlerts />

            <interview-popup v-if="interview?.enabled" :flag="interview.flag" :payload="interview.payload" />

            <PlatformDialog />
            <transition name="page-fade">
                <div v-if="overlay" class="ff-dialog-container z-100!" />
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
import LeftDrawer from '../components/drawers/LeftDrawer.vue'
import RightDrawer from '../components/drawers/RightDrawer.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useProductBrokersStore } from '@/stores/product-brokers.js'
import { useUxStore } from '@/stores/ux.js'

export default {
    name: 'ff-layout-platform',
    components: {
        LeftDrawer,
        RightDrawer,
        PageHeader,
        PlatformAlerts,
        PlatformDialog,
        InterviewPopup
    },
    computed: {
        ...mapState(useUxStore, ['overlay']),
        ...mapState(useProductBrokersStore, ['interview']),
        ...mapState(useAccountSettingsStore, ['hasAvailableTeams'])
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
