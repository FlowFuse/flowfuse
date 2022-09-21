<template>
    <form class="space-y-6">
        <FormRow v-model="input.deviceId" type="uneditable" id="deviceId" inputClass="font-mono">
            Device ID
        </FormRow>

        <FormRow v-model="input.deviceName" :type="editing.deviceName ? 'text' : 'uneditable'" ref="deviceName">
            Name
        </FormRow>

        <div v-if="hasPermission('device:edit')">
            <ff-button v-if="!editing.deviceName" kind="primary" @click="editDevice">Edit Device</ff-button>
            <ff-button v-else kind="primary" @click="updateDevice">Save Changes</ff-button>
        </div>
    </form>
</template>

<script>
import deviceApi from '@/api/devices'
import FormRow from '@/components/FormRow'

import { mapState } from 'vuex'
import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'DeviceSettings',
    props: ['device'],
    emits: ['device-updated'],
    mixins: [permissionsMixin],
    data () {
        return {
            editing: {
                deviceName: false
            },
            input: {
                deviceId: '',
                deviceName: ''
            },
            original: {
                deviceName: ''
            }
        }
    },
    watch: {
        device: 'fetchData'
    },
    computed: {
        ...mapState('account', ['teamMembership'])
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        editDevice () {
            this.original.deviceName = this.input.deviceName
            this.editing.deviceName = true
        },
        async updateDevice () {
            await deviceApi.updateDevice(this.device.id, { name: this.input.deviceName })
            this.editing.deviceName = false
            this.$emit('device-updated')
        },
        cancelEditName () {
            this.editing.deviceName = false
            this.input.deviceName = this.original.deviceName
        },
        fetchData () {
            if (this.device) {
                this.input.deviceId = this.device.id
                this.input.deviceName = this.device.name
            }
        }
    },
    components: {
        FormRow
    }
}
</script>
