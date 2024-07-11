<template>
    <ApplicationHeader :application="localApplication" />

    <InstancesWrapper :application="localApplication" :is-searching="isSearching" @delete-instance="onInstanceDelete" />

    <DevicesWrapper :application="localApplication" :is-searching="isSearching" @delete-device="$emit('device-deleted')" />

    <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="onInstanceDeleted" />
</template>

<script>
import ConfirmInstanceDeleteDialog from '../../../instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'

import ApplicationHeader from './ApplicationHeader.vue'

import DevicesWrapper from './compact/DevicesWrapper.vue'
import InstancesWrapper from './compact/InstancesWrapper.vue'

export default {
    name: 'ApplicationListItem',
    components: {
        ConfirmInstanceDeleteDialog,
        ApplicationHeader,
        InstancesWrapper,
        DevicesWrapper
    },
    props: {
        application: {
            type: Object,
            required: true
        },
        isSearching: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    emits: ['instance-deleted', 'device-deleted'],
    data () {
        return {
            localApplication: null
        }
    },
    watch: {
        application: 'setLocalApplication'
    },
    created () {
        this.setLocalApplication()
    },
    methods: {
        onInstanceDeleted (instance) {
            if (this.localApplication.instances.has(instance.id)) {
                this.localApplication.instances.delete(instance.id)
                this.localApplication.instanceCount--
                this.$emit('instance-deleted')
            }
        },
        onInstanceDelete (instance) {
            this.$refs.confirmInstanceDeleteDialog.show(instance)
        },
        setLocalApplication () {
            this.localApplication = this.application
        }
    }
}
</script>
