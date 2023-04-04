<template>
    <SectionTopMenu hero="Device Logs" help-header="FlowForge - Device Logs" info="Live logs from your FlowForge instances of Node-RED">
    </SectionTopMenu>
    <LogsShared :device="device" :instance="instance" />
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import LogsShared from './components/DeviceLog.vue'

export default {
    name: 'DeviceLogs',
    components: {
        SectionTopMenu,
        LogsShared
    },
    inheritAttrs: false,
    props: {
        device: { type: Object, required: true },
        instance: { type: Object, required: true }
    }
}
</script>
