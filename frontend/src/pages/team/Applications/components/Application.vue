<template>
    <ApplicationHeader :application="application" />

    <InstancesWrapper :application="application" @instance-deleted="onInstanceDeleted" />

    <DevicesWrapper :application="application" />
</template>

<script>
import ApplicationHeader from './ApplicationHeader.vue'

import DevicesWrapper from './DevicesWrapper.vue'
import InstancesWrapper from './InstancesWrapper.vue'

export default {
    name: 'ApplicationListItem',
    components: {
        ApplicationHeader,
        InstancesWrapper,
        DevicesWrapper
    },
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-deleted'],
    methods: {
        onInstanceDeleted (instance) {
            if (this.application.instances.has(instance.id)) {
                this.application.instances.delete(instance.id)
            }
        }
    }
}
</script>
