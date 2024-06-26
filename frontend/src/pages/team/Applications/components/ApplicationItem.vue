<template>
    <ApplicationHeader :application="application" />

    <InstancesList :application="application" @instance-deleted="onInstanceDeleted" />

    <DevicesList :application="application" />
</template>

<script>

import ApplicationHeader from './ApplicationHeader.vue'

import DevicesList from './DevicesList.vue'

import InstancesList from './InstancesList.vue'

export default {
    name: 'ApplicationItem',
    components: {
        ApplicationHeader,
        DevicesList,
        InstancesList
    },
    props: {
        application: {
            type: Object,
            required: true
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
