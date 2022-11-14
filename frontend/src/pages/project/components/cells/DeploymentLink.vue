<template>
    <a
        v-if="!disabled"
        :href="url"
        target="_blank"
        class="flex"
        data-action="open-editor"
    >
        <CloudIcon class="w-6 mr-2 text-gray-500" />
        <div class="flex flex-col space-y-1">
            {{ url }}
        </div>
    </a>
    <span
        v-else
        class="flex"
    >
        <CloudIcon class="w-6 mr-2 text-gray-500" />
        <div class="flex flex-col space-y-1">
            {{ url }}
        </div>
    </span>
</template>

<script>
import { CloudIcon } from '@heroicons/vue/outline'

export default {
    name: 'DeploymentLink',
    components: { CloudIcon },
    props: {
        url: {
            required: true,
            type: String
        },
        disabled: {
            type: Boolean,
            default: false
        }
    }
}
</script>
