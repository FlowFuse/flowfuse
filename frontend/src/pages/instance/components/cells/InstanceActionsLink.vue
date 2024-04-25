<template>
    <div class="flex justify-end">
        <InstanceActionsButton :instance="instance" />
    </div>
</template>

<script>
import InstanceActionsButton from '../../../../components/instance/ActionButtons.vue'

export default {
    name: 'InstanceActionsLinkCell',
    components: { InstanceActionsButton },
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    }
}
</script>
