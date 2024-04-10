import alerts from '../services/alerts.js'

export default {
    data () {
        return {
            alerts: []
        }
    },
    computed: {
        alertsReversed () {
            return [...this.alerts].reverse()
        }
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
    },
    mounted () {
        alerts.subscribe(this.alertReceived)
    }
}
