<template>
    <div class="mb-3">
        <SectionTopMenu hero="Node-RED Logs" info=""></SectionTopMenu>
    </div>
    <LogsShared :instance="instance" />
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import LogsShared from './components/InstanceLogs.vue'

export default {
    name: 'InstanceLogs',
    components: {
        LogsShared,
        SectionTopMenu
    },
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    }
}
</script>
