<template>
    <div class="flex items-center gap-2">
        <IconNodeRedSolid class="ff-icon ff-icon-lg text-red-800" />
        {{ name }}
    </div>
</template>

<script>
import IconNodeRedSolid from '../../../../components/icons/NodeRedSolid.js'
export default {
    name: 'InstanceName',
    components: {
        IconNodeRedSolid
    },
    props: {
        name: {
            required: true,
            type: String
        }
    }
}
</script>
