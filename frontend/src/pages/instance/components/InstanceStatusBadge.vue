<template>
    <StatusBadge
        :status="status"
        :text="text"
        :pendingChange="optimisticStateChange || pendingStateChange"
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
        status: {
            type: String,
            default: null
        },
        pendingStateChange: {
            type: Boolean,
            default: false
        },
        optimisticStateChange: {
            type: Boolean,
            default: false
        },
        text: {
            type: [Number, String],
            default: null
        }
    }
}
</script>
