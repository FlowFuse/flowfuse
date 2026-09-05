<template>
    <SectionTopMenu :hero="$t('ui.remotePerformance')" :help-header="$t('ui.flowfuseRemotePerformance')" :info="$t('ui.performanceMetricsForYourRemoteNodeRedInstance')" />
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
