<template>
    <span :class="{['forge-minimal-status-' + status]: true, 'animate-pulse': isTransitoryStatus }" class="minimal-status" />
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
        isTransitoryStatus () {
            return [
                'starting',
                'stopping',
                'restarting',
                'suspending',
                'importing',
                'installing'
            ].includes(this.status)
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
    transition: ease-in-out .3s;
}
</style>
