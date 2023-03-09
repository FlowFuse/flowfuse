<template>
    <LogsShared :instance="instance" />
</template>

<script>
import LogsShared from './components/InstanceLogs'

export default {
    name: 'InstanceLogs',
    components: {
        LogsShared
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
