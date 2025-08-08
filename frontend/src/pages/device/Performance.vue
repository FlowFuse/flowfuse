<template>
    <SectionTopMenu hero="Remote Performance" help-header="FlowFuse - Remote Performance" info="Performance metrics for your Remote Node-RED Instance" />
    <DevicePerformance :device="device" />
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import DevicePerformance from './components/DevicePerformance.vue'

export default {
    name: 'DevicePerformanceView',
    components: {
        SectionTopMenu,
        DevicePerformance
    },
    inheritAttrs: false,
    props: {
        device: { type: Object, required: true }
    }
}
</script>
