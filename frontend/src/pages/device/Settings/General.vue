<template>
    <form class="space-y-6">
        <FormRow v-model="input.deviceId" type="uneditable" id="deviceId" inputClass="font-mono">
            Device ID
        </FormRow>

        <FormRow v-model="input.deviceName" :type="editing.deviceName ? 'text' : 'uneditable'" ref="deviceName">
            Name
        </FormRow>
    </form>
</template>

<script>
import deviceApi from '@/api/devices'
import FormRow from '@/components/FormRow'

export default {
    name: 'DeviceSettings',
    props: ['device'],
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
    mounted () {
        this.fetchData()
    },
    methods: {
        editName () {
            this.original.deviceName = this.input.deviceName
            this.editing.deviceName = true
            setTimeout(() => {
                this.refs.deviceName.focus()
            }, 0)
        },
        async saveEditName () {
            this.editing.deviceName = false
            await deviceApi.updateDevice(this.device.id, { name: this.input.deviceName })
            this.$emit('deviceUpdated')
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
