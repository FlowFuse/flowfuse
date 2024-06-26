<template>
    <div v-if="devices.size === 0" class="ff-no-data">
        This Application currently has no <router-link :to="`/application/${application.id}/devices`" class="ff-link">attached devices</router-link>.
    </div>

    <component :is="listComponent" v-else data-el="application-devices">
        <label>Devices</label>
        <div
            v-for="device in Array.from(devices.values())"
            :key="device.id"
            data-el="application-device-item"
            @click.stop="openDevice(device)"
        >
            <component :is="deviceComponent" :device="device" />
        </div>
    </component>

    <div v-if="application.deviceCount > devices.size" class="ff-applications-list--details">
        Only the {{ devices.size }} <router-link :to="`/application/${application.id}/devices`" class="ff-link">devices</router-link> with the most recent activity are being displayed.
    </div>
</template>

<script>
import { markRaw } from 'vue'

import CompactApplicationDevice from './compact/ApplicationDevice.vue'
import CompactList from './compact/CompactList.vue'
import WideApplicationDevice from './wide/ApplicationDevice.vue'
import WideList from './wide/WideList.vue'

export default {
    name: 'DevicesWrapper',
    components: { WideList, WideApplicationDevice },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        },
        viewMode: {
            type: String,
            required: false,
            default: 'wide'
        }
    },
    data () {
        return {
            listComponents: {
                wide: markRaw(WideList),
                compact: markRaw(CompactList)
            },
            deviceComponents: {
                wide: markRaw(WideApplicationDevice),
                compact: markRaw(CompactApplicationDevice)
            }
        }
    },
    computed: {
        devices () {
            return this.application.devices
        },
        listComponent () {
            return this.listComponents[this.viewMode]
        },
        deviceComponent () {
            return this.deviceComponents[this.viewMode]
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
