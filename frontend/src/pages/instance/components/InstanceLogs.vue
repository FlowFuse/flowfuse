<template>
    <ff-loading v-if="loading" message="Loading Logs..." />
    <div v-if="showOfflineBanner" class="ff-banner ff-banner-info my-2 rounded p-2 font-mono">
        <span>
            <span>The Node-RED instance cannot be reached at this time. Please wait...</span>
        </span>
    </div>
    <div v-if="!instance.meta || instance.meta.state === 'suspended'" class="flex text-gray-500 justify-center italic mb-4 p-8">
        Logs unavailable
    </div>
    <div v-else :class="showOfflineBanner ? 'forge-log-offline-background' : ''" class="mx-auto text-xs border bg-gray-800 text-gray-200 rounded p-2 font-mono">
        <div v-if="prevCursor" class="flex">
            <a class="text-center w-full hover:text-blue-400 cursor-pointer pb-1" @click="loadPrevious">Load earlier...</a>
        </div>
        <div v-if="filteredLogEntries.length > 0">
            <span
                v-for="(item, itemIdx) in filteredLogEntries"
                :key="itemIdx"
                class="whitespace-pre-wrap"
                :class="'forge-log-entry-level-' + item.level"
                data-el="instance-log-row"
            >
                <template v-if="instance.ha?.replicas !== undefined">
                    [{{ item.src }}]
                </template>
                <span>{{ item.date }}</span>
                <span>{{ "  " }}</span>
                <span>{{ `[${item.level || ''}]`.padEnd(10, ' ') }}</span>
                <span class="flex-grow break-all whitespace-pre-wrap inline-flex">{{ item.msg }}</span>
                <br v-if="itemIdx !== filteredLogEntries.length - 1">
            </span>
        </div>
    </div>
</template>

<script>

import InstanceApi from '../../../api/instances.js'
import Alerts from '../../../services/alerts.js'
import { createPollTimer } from '../../../utils/timers.js'

const POLL_TIME = 5000

export default {
    name: 'LogsShared',
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        },
        filter: {
            default: null,
            type: String,
            required: false
        }
    },
    emits: ['ha-instance-detected'],
    data () {
        return {
            doneInitialLoad: false,
            loading: true,
            logEntries: [],
            prevCursor: null,
            nextCursor: null,
            checkInterval: null,
            showOfflineBanner: false,
            /** @type {import('../../../utils/timers.js').PollTimer} */
            pollTimer: null
        }
    },
    computed: {
        filteredLogEntries: function () {
            if (this.filter && this.filter !== 'all') {
                return this.logEntries.filter(l => l.src === this.filter)
            } else {
                return this.logEntries
            }
        }
    },
    watch: {
        instance: 'fetchData'
    },
    async mounted () {
        if (!this.instance.meta || this.instance.meta.state === 'suspended') {
            this.loading = false
        }
        await this.fetchData()
        // since the fetchdata is async, we need to check if the current page is
        // still the log page before starting the poll timer
        if (this.shouldPoll()) {
            this.pollTimer = createPollTimer(this.pollTimerElapsed, POLL_TIME)
        }
    },
    unmounted () {
        this.stopPolling()
    },
    beforeUnmount () {
        this.stopPolling()
    },
    methods: {
        shouldPoll: function () {
            return Object.hasOwnProperty.call(this.$route, 'meta') &&
                Object.hasOwnProperty.call(this.$route.meta, 'shouldPoll') &&
                this.$route.meta.shouldPoll
        },
        pollTimerElapsed: function () {
            if (this.instance.meta && this.instance.meta.state !== 'suspended') {
                this.loadNext()
            }
        },
        stopPolling: function () {
            if (this.pollTimer) {
                this.pollTimer.stop()
                this.pollTimer = null
            }
        },
        fetchData: async function () {
            if (this.instance.id) {
                if (this.instance.meta && this.instance.meta.state !== 'suspended') {
                    await this.loadItems(this.instance.id)
                    this.loading = false
                } else {
                    this.logEntries = []
                    this.prevCursor = null
                }
            }
        },
        loadPrevious: async function () {
            this.loadItems(this.instance.id, this.prevCursor)
        },
        loadNext: async function () {
            this.loadItems(this.instance.id, this.nextCursor)
        },
        loadItems: async function (instanceId, cursor) {
            // don't poll if the page is not the log page
            if (!this.shouldPoll()) {
                this.stopPolling()
                return
            }

            try {
                const entries = await InstanceApi.getInstanceLogs(instanceId, cursor, null, { showAlert: false })
                this.showOfflineBanner = false
                if (!cursor) {
                    this.prevCursor = null
                    this.logEntries = []
                }
                const toPrepend = []
                if (entries.log.length > 0) {
                    entries.log.forEach(l => {
                        const d = new Date(parseInt(l.ts.substring(0, l.ts.length - 4)))
                        l.date = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
                        if (typeof l.msg === 'undefined') {
                            l.msg = 'undefined'
                        } else if (typeof l.msg !== 'string') {
                            l.msg = JSON.stringify(l.msg)
                        }
                        l.msg = l.msg.replace(/^[\n]*/, '')
                        if (!cursor || cursor[0] !== '-') {
                            this.logEntries.push(l)
                        } else {
                            toPrepend.push(l)
                        }
                        if (l.src) {
                            this.$emit('ha-instance-detected', l.src)
                        }
                    })
                    if (toPrepend.length > 0) {
                        this.logEntries = toPrepend.concat(this.logEntries)
                    }
                    if (!cursor || cursor[0] === '-') {
                        this.prevCursor = entries.meta.previous_cursor
                    }
                    if (!cursor || cursor[0] !== '-') {
                        this.nextCursor = entries.meta.next_cursor
                    }
                }
            } catch (error) {
                // the page could have been switched while the async request was in progress, if so
                // stop the polling and return immediately to avoid unnecessary error alerts
                if (!this.shouldPoll()) {
                    this.stopPolling()
                    return
                }
                // log the error as warn for troubleshooting purposes
                console.warn('Unable to retrieve Node-RED instance logs:', error)

                // Error 503 is returned by the API when the launcher is offline.
                // Error 500 is handled (and surfaced) by the `client.interceptors` in `../../../api/client.js`
                // Error with data.code === 'project_suspended' is ignored - it is expected when the project is suspended
                if (error.response?.status === 503) {
                    if (this.showOfflineBanner === true) {
                        return // only show the alert once
                    }
                    this.showOfflineBanner = true // show the "offline" banner
                    Alerts.emit('The Node-RED instance cannot be reached at this time', 'warning', (POLL_TIME - 500))
                } else if (error.response?.status !== 500 && error.response?.data?.code !== 'project_suspended') {
                    // display an alert. Ensure it is visible for less time than
                    // the polling interval to avoid multiple visible alerts
                    const message = error.response?.data?.error || error.message
                    Alerts.emit('Could not get Node-RED logs: ' + message, 'warning', (POLL_TIME - 500))
                }
            }
        }
    }
}
</script>

<style scoped>
.forge-log-offline-background {
  background: repeating-linear-gradient(
      -45deg,
      #363848,
      #363848 10px,
      rgba(31, 41, 55, var(--tw-bg-opacity)) 10px,
      rgba(31, 41, 55, var(--tw-bg-opacity)) 20px
  );
}
</style>
