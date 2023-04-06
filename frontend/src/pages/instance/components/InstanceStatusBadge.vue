<template>
    <StatusBadge
        v-if="instance.meta"
        :status="instance.meta.state"
        :pendingChange="instance.optimisticStateChange || instance.pendingStateChange"
    />
</template>

<script>
import StatusBadge from '../../../components/StatusBadge.vue'

export default {
    name: 'InstanceStatusBadge',
    components: {
        StatusBadge
    },
    props: {
        instance: {
            type: Object,
            required: true
        }
    }
}
</script>
