<template>
    <ff-loading v-if="loading" message="Loading Logs..." />
    <template v-else>
        <div v-if="device?.status && deviceOnline" class="mx-auto text-xs border bg-gray-800 text-gray-200 rounded-sm p-2 font-mono flex flex-col w-full overflow-auto">
            <template v-if="logEntries.length > 0">
                <span
                    v-for="(item, itemIdx) in logEntries"
                    :key="itemIdx"
                    class="whitespace-pre-wrap"
                    :class="'forge-log-entry-level-' + item.level"
                >
                    <span>{{ item.date }}</span>
                    <span>{{ "  " }}</span>
                    <span>{{ `[${item.level || ''}]`.padEnd(10, ' ') }}</span>
                    <span class="grow break-all whitespace-pre-wrap">{{ item.msg.replace(/^[\n]*/, '') }}</span>
                    <br v-if="itemIdx !== logEntries.length - 1">
                </span>
            </template>
            <template v-else>
                <div class="font-mono p-4 text-gray-400 text-center">Waiting for logs...</div>
            </template>
        </div>
        <div v-else class="ff-no-data my-2">Logs Unavailable</div>
    </template>
</template>

<script>
import deviceApi from '../../../api/devices.js'

import getServicesOrchestrator from '@/services/service.orchestrator'

const HEARTBEAT_INTERVAL = 10000

export default {
    name: 'DeviceLogView',
    inheritAttrs: false,
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['connected', 'disconnected'],
    data () {
        return {
            loading: true,
            logEntries: [],
            keepAliveInterval: null
        }
    },
    computed: {
        deviceOnline () {
            const offline = ['stopped', 'offline', 'error']
            return !offline.includes(this.device.status)
        },
        mqttConnectionKey () {
            return `device-logs-${this.device.id}`
        },
        logTopic () {
            return `ff/v1/${this.device.team.id}/d/${this.device.id}/logs`
        }
    },
    watch: {
        device: {
            immediate: true,
            handler (device) {
                if (device && device.id) {
                    this.connectMQTT()
                }
            }
        }
    },
    unmounted () {
        this.disconnectMQTT()
    },
    methods: {
        getMqttService () {
            return getServicesOrchestrator().$serviceInstances.mqtt
        },
        async connectMQTT () {
            const mqttService = this.getMqttService()

            await mqttService.createClient(this.mqttConnectionKey, {
                getCredentials: () => deviceApi.getDeviceLogCreds(this.device.id),
                onConnect: async (_connack, client) => {
                    await mqttService.subscribe(this.mqttConnectionKey, this.logTopic)
                    this.loading = false

                    await mqttService.publishMessage(this.mqttConnectionKey, {
                        topic: `${this.logTopic}/heartbeat`,
                        payload: 'alive',
                        qos: 0,
                        serialize: 'raw'
                    })

                    clearInterval(this.keepAliveInterval)
                    this.keepAliveInterval = setInterval(() => {
                        mqttService.publishMessage(this.mqttConnectionKey, {
                            topic: `${this.logTopic}/heartbeat`,
                            payload: 'alive',
                            qos: 0,
                            serialize: 'raw'
                        }).catch(() => {})
                    }, HEARTBEAT_INTERVAL)

                    this.$emit('connected')
                },
                onClose: () => {
                    this.loading = false
                    this.$emit('disconnected')
                },
                onOffline: () => {
                    this.$emit('disconnected')
                },
                onError: () => {
                    this.$emit('disconnected')
                },
                onMessage: (topic, message) => {
                    const m = JSON.parse(message)
                    if (!Array.isArray(m)) {
                        this.processLogEntry(m)
                    } else {
                        m.forEach((row) => this.processLogEntry(row))
                    }
                }
            })
        },
        processLogEntry (entry) {
            if (!isNaN(entry.ts)) {
                entry.ts = `${entry.ts}`
            }
            const d = new Date(parseInt(entry.ts.substring(0, entry.ts.length - 4)))
            entry.date = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
            if (typeof entry.msg !== 'string') {
                entry.msg = JSON.stringify(entry.msg)
            }
            this.logEntries.push(entry)
        },
        async disconnectMQTT () {
            clearInterval(this.keepAliveInterval)
            const mqttService = this.getMqttService()
            if (mqttService.hasClient(this.mqttConnectionKey)) {
                await mqttService.destroyClient(this.mqttConnectionKey)
            }
        }
    }
}
</script>
