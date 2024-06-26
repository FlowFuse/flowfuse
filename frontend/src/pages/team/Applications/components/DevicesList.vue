<template>
    <section v-if="devices.size > 0" class="ff-applications-list-instances" data-el="application-devices">
        <label>Devices</label>
        <div v-for="device in Array.from(devices.values())" :key="device.id" @click.stop="openDevice(device)">
            <ApplicationDevice :device="device" />
        </div>
    </section>
    <div v-else class="ff-no-data">
        This Application currently has no <router-link :to="`/application/${application.id}/devices`" class="ff-link">attached devices</router-link>.
    </div>

    <div v-if="application.deviceCount > devices.size" class="ff-applications-list--details">
        Only the {{ devices.size }} <router-link :to="`/application/${application.id}/devices`" class="ff-link">devices</router-link> with the most recent activity are being displayed.
    </div>
</template>

<script>
import ApplicationDevice from './ApplicationDevice.vue'

export default {
    name: 'DevicesList',
    components: { ApplicationDevice },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    computed: {
        devices () {
            return this.application.devices
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
