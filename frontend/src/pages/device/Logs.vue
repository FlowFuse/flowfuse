<template>
    <div id="device-logs" class="overflow-auto flex flex-col flex-1 ">
        <SectionTopMenu hero="Node-RED Logs" help-header="FlowFuse - Node-RED Logs" info="Live logs from your Remote Node-RED Instance">
            <template #tools>
                <template v-if="deviceOnline && connected">
                    <div class="flex items-center gap-2 text-green-500">
                        <WifiIcon class="ff-icon" />
                        Connected to Live Logs
                    </div>
                </template>
                <template v-else-if="!deviceOnline || offline">
                    <div class="flex items-center gap-2 text-red-500">
                        <WifiIcon class="ff-icon" />
                        Offline
                    </div>
                </template>
                <template v-else>
                    <div class="flex items-center gap-2 text-gray-500">
                        <WifiIcon class="ff-icon" />
                        Connecting to Live Logs
                    </div>
                </template>
            </template>
        </SectionTopMenu>
        <LogsShared :device="device" @connected="connected = true" @disconnected="offline = true" />
    </div>
</template>

<script>
import { WifiIcon } from '@heroicons/vue/outline'

import SectionTopMenu from '../../components/SectionTopMenu.vue'

import LogsShared from './components/DeviceLog.vue'

export default {
    name: 'DeviceLogs',
    components: {
        WifiIcon,
        SectionTopMenu,
        LogsShared
    },
    inheritAttrs: false,
    props: {
        device: { type: Object, required: true }
    },
    data () {
        return {
            connected: false,
            offline: false
        }
    },
    computed: {
        deviceOnline () {
            const offline = ['stopped', 'offline', 'error']
            return !offline.includes(this.device?.status)
        }
    }
}
</script>
