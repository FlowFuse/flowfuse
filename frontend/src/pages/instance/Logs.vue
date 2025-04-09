<template>
    <div class="mb-3">
        <SectionTopMenu hero="Node-RED Logs" info="">
            <template #tools>
                <div style="display: flex;align-items: center;">
                    <div class="mr-2"><strong>Jump:</strong></div>
                    <DateTimePicker
                        v-model="startDate"
                        is-24
                        enable-seconds
                        placeholder="Start Time"
                        :locale="locale"
                        :format="format"
                        :min-date="logsStartDate"
                        :max-date="logsEndDate"
                        :startTime="startTime"
                    />
                </div>
                <div v-if="instance.ha?.replicas != undefined" style="display: flex;align-items: center;">
                    <div class="mr-2"><strong>Replica:</strong></div>
                    <ff-listbox
                        ref="dropdown"
                        v-model="selectedHAId"
                        data-el="select-ha-replica"
                        :options="haIdOptions"
                    />
                </div>
            </template>
        </SectionTopMenu>
    </div>
    <LogsShared ref="logs" :instance="instance" :filter="selectedHAId" @ha-instance-detected="newHAId" @new-range="newRange" />
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import DateTimePicker from '../../ui-components/components/form/DateTime.vue'
import FfListbox from '../../ui-components/components/form/ListBox.vue'

import LogsShared from './components/InstanceLogs.vue'

export default {
    name: 'InstanceLogs',
    components: {
        DateTimePicker,
        FfListbox,
        LogsShared,
        SectionTopMenu
    },
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            haIds: [],
            selectedHAId: 'all',
            startDate: null,
            logsStartDate: null,
            logsEndDate: null
        }
    },
    computed: {
        haIdOptions () {
            return [{ label: 'All', value: 'all' }, ...this.haIds.map(id => ({ label: id, value: id }))]
        },
        locale () {
            return window.navigator.language
        },
        startTime () {
            return {
                hours: this.logsEndDate ? this.logsEndDate.getHours() : 0,
                minutes: this.logsEndDate ? this.logsEndDate.getMinutes() : 0,
                seconds: this.logsEndDate ? this.logsEndDate.getSeconds() : 0
            }
        }
    },
    watch: {
        async range (newState) {
            const newStartTime = Date.parse(newState)
            // this.$refs.logs.stopPolling()
            this.$refs.logs.clear()
            await this.$refs.logs.loadItems(this.instance.id, newStartTime * 10000)
        }
    },
    methods: {
        newHAId (id) {
            if (!this.haIds.includes(id)) {
                this.haIds.push(id)
            }
        },
        newRange (d) {
            this.logsStartDate = new Date(d.first / 10000)
            this.logsEndDate = new Date(d.last / 10000)
        },
        format (date) {
            return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
        }
    }
}
</script>
