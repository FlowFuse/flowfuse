<template>
    <ff-loading v-if="loading" message="Loading Logs..." />
    <div
        v-if="device?.status && device?.status !== 'stopped'"
        class="mx-auto text-xs border bg-gray-800 text-gray-200 rounded p-2 font-mono"
    >
        <div
            v-for="(item, itemIdx) in logEntries"
            :key="itemIdx"
            class="flex"
            :class="'forge-log-entry-level-' + item.level"
        >
            <div class="w-40 flex-shrink-0">{{ item.date }}</div>
            <div class="w-20 flex-shrink-0 align-right">[{{ item.level }}]</div>
            <div class="flex-grow break-all whitespace-pre-wrap">
                {{ item.msg.replace(/^[\n]*/, "") }}
            </div>
        </div>
    </div>
    <div v-else>Logs unavailable</div>
</template>

<script>
import deviceApi from '../../../api/devices.js'

let mqtt

export default {
    name: 'DeviceLogView',
    inheritAttrs: false,
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            loading: true,
            logEntries: [],
            prevCursor: null,
            nextCursor: null,
            keepAliveInterval: null,
            connection: null,
            client: null
        }
    },
    async mounted () {
    // need to subscribe to log stream
        const { default: mqttImp } = await import('mqtt')
        mqtt = mqttImp
        this.connectMQTT()
    },
    unmounted () {
    // need to unsubscribe here
        this.disconnectMQTT()
        clearInterval(this.keepAliveInterval)
    },
    methods: {
        connectMQTT: async function () {
            const creds = await deviceApi.getDeviceLogCreds(this.device.id)
            this.client = mqtt.connect(creds.url, {
                username: creds.username,
                password: creds.password,
                reconnectPeriod: 0
            })

            this.client.on('connect', () => {
                const topic = `ff/v1/${this.device.team.id}/d/${this.device.id}/logs`
                this.client.subscribe(topic)
                this.loading = false
                this.client.publish(`${topic}/heartbeat`, 'alive')
                this.keepAliveInterval = setInterval(() => {
                    this.client.publish(`${topic}/heartbeat`, 'alive')
                }, 20000)
            })

            this.client.on('message', (topic, message) => {
                const m = JSON.parse(message)
                if (!Array.isArray(m)) {
                    if (!isNaN(m.ts)) {
                        m.ts = `${m.ts}`
                    }
                    const d = new Date(parseInt(m.ts.substring(0, m.ts.length - 4)))
                    m.date = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
                    if (typeof m.msg !== 'string') {
                        m.msg = JSON.stringify(m.msg)
                    }
                    this.logEntries.push(m)
                } else {
                    m.forEach((row) => {
                        if (!isNaN(row.ts)) {
                            row.ts = `${row.ts}`
                        }
                        const d = new Date(
                            parseInt(row.ts.substring(0, row.ts.length - 4))
                        )
                        row.date = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
                        if (typeof row.msg !== 'string') {
                            row.msg = JSON.stringify(row.msg)
                        }
                        this.logEntries.push(row)
                    })
                }
            })
        },
        disconnectMQTT: async function () {
            if (this.client.connected) {
                this.client.end()
            }
            this.client = null
        }
    }
}
</script>
