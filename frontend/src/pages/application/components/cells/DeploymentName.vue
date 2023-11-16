<template>
    <span
        class="flex items-center"
    >
        <ProjecsIcon class="w-6 mr-2 text-red-800" />
        <div class="flex flex-col space-y-1">
            {{ name }}
        </div>
    </span>
</template>

<script>
import ProjecsIcon from '../../../../components/icons/Projects.js'

export default {
    name: 'DeploymentName',
    components: { ProjecsIcon },
    inheritAttrs: false,
    props: {
        name: {
            required: true,
            type: String
        }
    }
}
</script>
