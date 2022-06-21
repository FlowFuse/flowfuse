<template>
    <div class="ff-layout--platform">
        <PageHeader :mobile-menu-open="mobileMenuOpen" @menu-toggle="toggleMenu"/>
        <div class="ff-layout--platform--wrapper">
            <div id="platform-sidenav" class="ff-navigation" :class="{'open': mobileMenuOpen}">
                <!-- Each view uses a <Teleport> to fill this -->
            </div>
            <div class="ff-view">
                <slot></slot>
            </div>
            <TransitionGroup class="ff-notifications" name="notifictions-list" tag="div">
                <ff-notification-toast v-for="(a, $index) in alertsReceived" :key="a.timestamp"
                                       :type="a.type" :message="a.message" @close="clear($index)"></ff-notification-toast>
            </TransitionGroup>
        </div>
    </div>
</template>

<script>
import PageHeader from '@/components/PageHeader.vue'

import Alerts from '@/services/alerts.js'

export default {
    name: 'ff-layout-platform',
    components: {
        PageHeader
    },
    data () {
        return {
            mobileMenuOpen: false,
            alerts: []
        }
    },
    computed: {
        alertsReversed: function () {
            return [...this.alerts].reverse()
        }
    },
    watch: {
        $route: function () {
            this.checkRouteMeta()
            this.mobileMenuOpen = false
        }
    },
    mounted () {
        this.checkRouteMeta()
        Alerts.subscribe(this.alertReceived)
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
        },
        notificationReceived (msg, type) {
            this.alerts.push({
                message: msg,
                type: type,
                timestamp: Date.now()
            })
        },
        clear (i) {
            this.alerts.splice(this.notifications.length - 1 - i, 1)
        }
    }
}
</script>
