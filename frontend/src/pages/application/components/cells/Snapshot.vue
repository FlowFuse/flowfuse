<template>
    <span class="flex space-x-4">
        <span
            v-if="activeSnapshot?.id || updateNeeded"
            v-ff-tooltip:left="'Target snapshot has not yet been deployed to this device.'"
            class="flex items-center space-x-2 text-gray-500 italic"
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
        <template v-if="activeSnapshot">
            <div class="flex flex-col">
                <span data-el="snapshot-name">{{ activeSnapshot?.name }}</span>
                <span class="text-xs text-gray-500" data-el="snapshot-id">{{ activeSnapshot.id }}</span>
            </div>
        </template>
        <template v-else>
            <span class="italic text-gray-500" data-el="snapshot-name">none</span>
        </template>
    </span>
</template>

<script>
import { CheckCircleIcon, ExclamationIcon } from '@heroicons/vue/outline'

export default {
    name: 'SnapshotCell',
    components: {
        ExclamationIcon,
        CheckCircleIcon
    },
    inheritAttrs: false,
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
