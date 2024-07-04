<template>
    <div v-if="hasNoDevices" class="ff-no-data">
        This Application currently has no
        <router-link :to="`/application/${application.id}/devices`" class="ff-link">attached devices</router-link>
        .
    </div>

    <section v-else class="ff-applications-list-instances" data-el="application-devices">
        <label>Devices</label>
        <div v-for="device in Array.from(application.devices.values())" :key="device.id" class="item-wrapper" @click.stop="openDevice(device)">
            <DeviceRow :device="device" />
        </div>
    </section>

    <div v-if="hasMoreDevices" class="ff-applications-list--details">
        Only the {{ application.devices.size }}
        <router-link :to="`/application/${application.id}/devices`" class="ff-link">devices</router-link>
        with the most recent activity are being displayed.
    </div>
</template>

<script>
import DeviceRow from './DeviceRow.vue'

export default {
    name: 'DevicesWrapper',
    components: { DeviceRow },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    computed: {
        hasMoreDevices () {
            return this.application.deviceCount > this.application.devices.size
        },
        hasNoDevices () {
            return this.application.devices.size === 0
        }
    },
    methods: {
        openDevice (device) {
            this.$router.push({
                name: 'Device',
                params: {
                    id: device.id
                }
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
