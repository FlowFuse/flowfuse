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
    <LogsShared :instance="instance" :filter="selectedHAId" @ha-instance-detected="newHAId" ref="logs"/>
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import FfListbox from '../../ui-components/components/form/ListBox.vue'
import DateTimePicker from '../../ui-components/components/form/DateTime.vue'

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
            startTime: null
        }
    },
    computed: {
        haIdOptions () {
            return [{ label: 'All', value: 'all' }, ...this.haIds.map(id => ({ label: id, value: id }))]
        }
    },
    methods: {
        newHAId (id) {
            if (!this.haIds.includes(id)) {
                this.haIds.push(id)
            }
        },
    },
    watch: {
        range (newState) {
            console.log(newState)
            this.startTime = Date.parse(newState[0])
            this.$refs.logs.stopPolling()
        }
    }
}
</script>
