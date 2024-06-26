<template>
    <div v-if="hasNoDevices" class="ff-no-data">
        This Application currently has no
        <router-link :to="`/application/${application.id}/devices`" class="ff-link">attached devices</router-link>
        .
    </div>

    <section v-else class="ff-applications-list-instances--compact" data-el="application-devices">
        <label><IconDeviceSolid class="ff-icon ff-icon-sm text-teal-700" /> Devices</label>
        <div class="wrapper">
            <div v-for="device in Array.from(application.devices.values())" :key="device.id" @click.stop="openDevice(device)">
                <ApplicationDevice :device="device" />
            </div>
            <div v-if="hasMoreDevices" class="has-more ff-applications-list--instance">HAS MORE</div>
        </div>
    </section>
</template>

<script>
import IconDeviceSolid from '../../../../../components/icons/DeviceSolid.js'

import ApplicationDevice from './ApplicationDevice.vue'

export default {
    name: 'DevicesWrapper',
    components: { IconDeviceSolid, ApplicationDevice },
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
