<template>
    <div class="ff-layout--platform">
        <PageHeader :mobileMenuOpen="mobileMenuOpen" @menu-toggle="toggleMenu" />
        <div class="ff-layout--platform--wrapper">
            <div id="platform-sidenav" class="ff-navigation" :class="{'open': mobileMenuOpen}" data-sentry-unmask>
                <!-- Each view uses a <Teleport> to fill this -->
            </div>
            <div class="ff-view">
                <div id="platform-banner" />
                <slot />
            </div>
            <TransitionGroup class="ff-notifications" name="notifications-list" tag="div">
                <ff-notification-toast
                    v-for="(a, $index) in alertsReversed" :key="a.timestamp"
                    :type="a.type" :message="a.message" data-el="notification-alert"
                    :countdown="a.countdown || 3000" @close="clear($index)"
                />
            </TransitionGroup>
            <interview-popup v-if="interview?.enabled" :flag="interview.flag" :payload="interview.payload" />
            <ff-dialog ref="dialog" data-el="platform-dialog" :header="dialog.header" :kind="dialog.kind" :disable-primary="dialog.disablePrimary" :confirm-label="dialog.confirmLabel" @cancel="clearDialog(true)" @confirm="dialog.onConfirm">
                <p v-if="dialog.text">{{ dialog.text }}</p>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div class="space-y-2" v-html="dialog.html" />
            </ff-dialog>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import InterviewPopup from '../components/InterviewPopup.vue'
import PageHeader from '../components/PageHeader.vue'
import AlertsMixin from '../mixins/Alerts.js'
import DialogMixin from '../mixins/Dialog.js'

export default {
    name: 'ff-layout-platform',
    components: {
        PageHeader,
        InterviewPopup
    },
    mixins: [AlertsMixin, DialogMixin],
    data () {
        return {
            mobileMenuOpen: false
        }
    },
    computed: {
        ...mapState('product', ['interview'])
    },
    watch: {
        $route: function () {
            this.checkRouteMeta()
            this.mobileMenuOpen = false
        }
    },
    mounted () {
        this.checkRouteMeta()
    },
    methods: {
        toggleMenu () {
            this.mobileMenuOpen = !this.mobileMenuOpen
        },
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
