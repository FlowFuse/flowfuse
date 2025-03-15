<template>
    <SectionTopMenu hero="Node-RED Logs" help-header="FlowFuse - Node-RED Logs" info="Live logs from your Remote Node-RED Instance" />
    <LogsShared :device="device" />
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
        device: { type: Object, required: true }
    }
}
</script>
