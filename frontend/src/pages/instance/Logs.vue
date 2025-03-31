<template>
    <div class="mb-3">
        <SectionTopMenu hero="Node-RED Logs" info="">
            <template #tools>
                <div style="display: flex;align-items: center;">
                    <div class="mr-2"><strong>Jump:</strong></div>
                    <DateTimePicker
                        v-model="range"
                        model-auto
                        range
                        is-24
                        placeholder="Start Time"
                        :min-date="startTime"
                        :max-date="endTime"
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
            range: [],
            startTime: null,
            endTime: null
        }
    },
    computed: {
        haIdOptions () {
            return [{ label: 'All', value: 'all' }, ...this.haIds.map(id => ({ label: id, value: id }))]
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
            this.startTime = new Date(d.first / 10000)
            this.endTime = new Date(d.last / 10000)
        }
    }
}
</script>
