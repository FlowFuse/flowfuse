<template>
    <SectionTopMenu hero="Device Logs" help-header="FlowForge - Device Logs" info="Live logs from your FlowForge instances of Node-RED">
        <template>
        </template>
        <template #tools>
        </template>
    </SectionTopMenu>
    <LogsShared :device="device" :instance="instance"/>
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu'
import LogsShared from './components/DeviceLog'

export default {
    name: 'DeviceLogs',
    components: {
        SectionTopMenu,
        LogsShared
    },
    props: [
        'device',
        'instance'
    ],
    inheritAttrs: false
}
</script>
