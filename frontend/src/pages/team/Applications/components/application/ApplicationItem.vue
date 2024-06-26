<template>
    <ApplicationHeader :application="application" />

    <InstancesWrapper :application="application" :viewMode="viewMode" @instance-deleted="onInstanceDeleted" />

    <DevicesWrapper :application="application" :viewMode="viewMode" />
</template>

<script>

import ApplicationHeader from './ApplicationHeader.vue'

import DevicesWrapper from './DevicesWrapper.vue'

import InstancesWrapper from './InstancesWrapper.vue'

export default {
    name: 'ApplicationItem',
    components: {
        ApplicationHeader,
        DevicesWrapper,
        InstancesWrapper
    },
    props: {
        application: {
            type: Object,
            required: true
        },
        viewMode: {
            type: String,
            required: false,
            default: 'wide'
        }
    },
    emits: ['instance-deleted'],
    computed: {
        instances () {
            return Array.from(this.application.instances.values())
        }
    },
    methods: {
        onInstanceDeleted (instance) {
            if (this.application.instances.has(instance.id)) {
                this.application.instances.delete(instance.id)
            }
        }
    }
}
</script>
