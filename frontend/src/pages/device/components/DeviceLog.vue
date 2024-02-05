<template>
    <ff-loading v-if="loading" message="Loading Logs..." />
    <div v-if="device?.status && device?.status !== 'stopped'" class="mx-auto text-xs border bg-gray-800 text-gray-200 rounded p-2 font-mono">
        <span
            v-for="(item, itemIdx) in logEntries"
            :key="itemIdx"
            class="whitespace-pre-wrap"
            :class="'forge-log-entry-level-' + item.level"
        >
            <span>{{ item.date }}</span>
            <span>{{ "  " }}</span>
            <span>{{ `[${item.level || ''}]`.padEnd(10, ' ') }}</span>
            <span class="flex-grow break-all whitespace-pre-wrap">{{ item.msg.replace(/^[\n]*/, '') }}</span>
            <br v-if="itemIdx !== logEntries.length - 1">
        </span>
    </div>
    <div v-else>
        Logs unavailable
    </div>
</template>

<script>

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
            connection: null
        }
    },
    mounted () {
        // need to subscribe to log stream
        this.connect()
    },
    unmounted () {
        // need to unsubscribe here
        this.disconnect()
        clearInterval(this.keepAliveInterval)
    },
    methods: {
        connect: async function () {
            if (this.connection === null) {
                try {
                    const protocol = location.protocol === 'http:' ? 'ws:' : 'wss:'
                    this.connection = new WebSocket(`${protocol}//${location.host}/api/v1/devices/${this.device.id}/logs`)
                    this.connection.onopen = () => {
                        this.loading = false
                    }
                    this.connection.onmessage = message => {
                        const m = JSON.parse(message.data)
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
                            m.forEach(row => {
                                if (!isNaN(row.ts)) {
                                    row.ts = `${row.ts}`
                                }
                                const d = new Date(parseInt(row.ts.substring(0, row.ts.length - 4)))
                                row.date = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
                                if (typeof row.msg !== 'string') {
                                    row.msg = JSON.stringify(row.msg)
                                }
                                this.logEntries.push(row)
                            })
                        }
                    }
                } catch (e) {
                    console.error(e)
                }
            }
        },
        disconnect: async function () {
            if (this.connection) {
                this.connection.close()
            }
            this.connection = null
        }
    }
}

</script>
