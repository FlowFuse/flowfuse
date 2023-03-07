<template>
    <span
        class="flex"
    >
        <CloudIcon class="w-6 mr-2 text-gray-500" />
        <div class="flex flex-col space-y-1">
            {{ name }}
        </div>
    </span>
</template>

<script>
import { CloudIcon } from '@heroicons/vue/outline'

export default {
    name: 'DeploymentName',
    components: { CloudIcon },
    inheritAttrs: false,
    props: {
        name: {
            required: true,
            type: String
        }
    }
}
</script>
