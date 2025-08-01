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

            <TransitionGroup class="ff-notifications" name="notifications-list" tag="div">
                <ff-notification-toast
                    v-for="(a, $index) in alertsReversed" :key="a.timestamp"
                    :type="a.type" :message="a.message" data-el="notification-alert"
                    :countdown="a.countdown || 3000" @close="clear($index)"
                />
            </TransitionGroup>

            <interview-popup v-if="interview?.enabled" :flag="interview.flag" :payload="interview.payload" />

            <ff-dialog
                ref="dialog" data-el="platform-dialog"
                :header="dialog.header"
                :kind="dialog.kind"
                :disable-primary="dialog.disablePrimary"
                :confirm-label="dialog.confirmLabel"
                :cancel-label="dialog.cancelLabel"
                :canBeCanceled="dialog.canBeCanceled"
                :box-class="dialog.boxClass"
                @cancel="clearDialog(true)"
                @confirm="dialog.onConfirm"
            >
                <template v-if="dialog.textLines">
                    <div class="space-y-2">
                        <p v-for="(text, $index) in dialog.textLines" :key="$index">{{ text }}</p>
                    </div>
                </template>
                <component :is="dialog.is.component" v-bind="dialog.is.payload" v-else-if="dialog.is" />

                <p v-else-if="dialog.text">{{ dialog.text }}</p>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div v-else class="space-y-2" v-html="dialog.html" />
            </ff-dialog>
            <transition name="page-fade">
                <div v-if="overlay" class="ff-dialog-container !z-[100]" />
            </transition>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import InterviewPopup from '../components/InterviewPopup.vue'
import PageHeader from '../components/PageHeader.vue'
import LeftDrawer from '../components/drawers/LeftDrawer.vue'
import RightDrawer from '../components/drawers/RightDrawer.vue'
import AlertsMixin from '../mixins/Alerts.js'
import DialogMixin from '../mixins/Dialog.js'

export default {
    name: 'ff-layout-platform',
    components: {
        LeftDrawer,
        RightDrawer,
        PageHeader,
        InterviewPopup
    },
    mixins: [AlertsMixin, DialogMixin],
    computed: {
        ...mapState('product', ['interview']),
        ...mapState('ux', ['leftDrawer', 'overlay']),
        ...mapGetters('account', ['hasAvailableTeams'])
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
