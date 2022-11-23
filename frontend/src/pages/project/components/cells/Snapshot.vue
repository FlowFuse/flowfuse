<template>
    <span class="flex space-x-4">
        <span
            v-if="activeSnapshot?.id || updateNeeded"
            class="flex items-center space-x-2 text-gray-500 italic"
            v-ff-tooltip:left="'Target snapshot has not yet been deployed to this device.'"
        >
            <ExclamationIcon
                v-if="updateNeeded"
                class="text-yellow-600 w-4"
            />
            <CheckCircleIcon
                v-else-if="activeSnapshot?.id"
                class="text-green-700 w-4"
            />
        </span>
        <template v-if="activeSnapshot"><div class="flex flex-col"><span>{{ activeSnapshot?.name }}</span><span class="text-xs text-gray-500">{{ activeSnapshot.id }}</span></div></template>
        <template v-else><span class="italic text-gray-500">none</span></template>
    </span>
</template>

<script>
import { CheckCircleIcon, ExclamationIcon } from '@heroicons/vue/outline'

export default {
    name: 'CloudLink',
    components: {
        ExclamationIcon,
        CheckCircleIcon
    },
    props: {
        activeSnapshot: {
            default: null,
            type: Object
        },
        targetSnapshot: {
            default: null,
            type: Object
        }
    },
    computed: {
        updateNeeded: function () {
            return !this.activeSnapshot || (this.activeSnapshot?.id !== this.targetSnapshot?.id)
        }
    }
}
</script>
