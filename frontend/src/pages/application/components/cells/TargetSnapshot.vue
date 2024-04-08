<template>
    <span class="flex space-x-4">
        <span
            v-ff-tooltip:left="targetSnapshot.description"
            class="flex items-center space-x-2 text-gray-500 italic"
        >
            <ExclamationIcon
                v-if="!targetSnapshot?.id"
                class="text-yellow-600 w-4"
            />
            <CheckCircleIcon
                v-else
                class="text-green-700 w-4"
            />
        </span>
        <template v-if="targetSnapshot?.id"><div class="flex flex-col">
            <span data-el="snapshot-name">{{ targetSnapshot?.name }}</span>
            <span class="text-xs text-gray-500" data-el="snapshot-id">{{ targetSnapshot?.id }}</span></div>
        </template>
        <template v-else>
            <span class="italic text-gray-500" data-el="snapshot-name">none</span>
        </template>
    </span>
</template>

<script>
import { CheckCircleIcon, ExclamationIcon } from '@heroicons/vue/outline'

export default {
    name: 'TargetSnapshotCell',
    components: {
        ExclamationIcon,
        CheckCircleIcon
    },
    inheritAttrs: false,
    props: {
        targetSnapshot: {
            default: null,
            type: Object
        }
    }
}
</script>
