<template>
    <div class="flex justify-end">
        <InstanceActionsButton :instance="instance" @instance-deleted="$emit('instance-deleted', $event)" />
    </div>
</template>

<script>
import InstanceActionsButton from '../../../../components/instance/ActionButton.vue'

export default {
    name: 'InstanceActionsLinkCell',
    components: { InstanceActionsButton },
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    emits: ['instance-deleted']
}
</script>
