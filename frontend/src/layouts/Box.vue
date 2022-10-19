<template>
    <div class="ff-layout--box">
        <div class="ff-layout--box--wrapper">
            <div class="ff-layout--box--content">
                <div class="ff-logo">
                    <img src="@/images/ff-logo--wordmark-caps--dark.png" />
                </div>
                <slot></slot>
            </div>
        </div>
        <TransitionGroup class="ff-notifications" name="notifictions-list" tag="div">
            <ff-notification-toast v-for="(a, $index) in alertsReversed"
                                   :key="a.timestamp"
                                   :type="a.type"
                                   :message="a.message"
                                   :countdown="a.countdown || 3000"
                                   @close="clear($index)">
            </ff-notification-toast>
        </TransitionGroup>
    </div>
</template>

<script>
import alerts from '@/services/alerts.js'
export default {
    name: 'ff-layout-box',
    data () {
        return {
            alerts: []
        }
    },
    computed: {
        alertsReversed: function () {
            return [...this.alerts].reverse()
        }
    },
    mounted () {
        alerts.subscribe(this.alertReceived)
    },
    methods: {
        alertReceived (msg, type, countdown) {
            this.alerts.push({
                message: msg,
                type,
                countdown,
                timestamp: Date.now()
            })
        },
        clear (i) {
            this.alerts.splice(this.alerts.length - 1 - i, 1)
        }
    }
}
</script>

<style lang="scss" scoped>

</style>
