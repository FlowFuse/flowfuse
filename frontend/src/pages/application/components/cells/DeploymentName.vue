<template>
    <span
        class="flex items-center gap-2"
    >
        <IconNodeRedSolid class="ff-icon ff-icon-lg text-red-800" />
        <div class="flex flex-col space-y-1">
            {{ name }}
        </div>
    </span>
</template>

<script>
import IconNodeRedSolid from '../../../../components/icons/NodeRedSolid.js'

export default {
    name: 'DeploymentName',
    components: { IconNodeRedSolid },
    inheritAttrs: false,
    props: {
        name: {
            required: true,
            type: String
        }
    }
}
</script>
