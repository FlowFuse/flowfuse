<template>
    <span :class="['forge-minimal-status-' + status]" class="minimal-status" />
</template>

<script>

export default {
    name: 'InstanceStatusBadge',
    components: {
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
        },
        instanceType: {
            type: String,
            default: null
        },
        instanceId: {
            type: String,
            default: null
        }
    },
    computed: {
        badgeColor () {
            switch (true) {
            case this.status === 'error':
                return 'red'
            default:
                return 'gray'
            }
        }
    }
}
</script>

<style lang="scss">
.minimal-status {
    display: block;
    height: 10px;
    width: 10px;
    border-radius: 50%;
}
</style>
