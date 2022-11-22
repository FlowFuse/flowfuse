<template>
    <div class="flex items-center">
        <ClockIcon class="w-6 mr-2 text-gray-500" />
        <div class="flex flex-grow flex-col space-y-1">
            <span class="text-md">{{ name }}</span>
            <span class="text-xs text-gray-500">id: {{ id }}</span>
            <template v-if="description">
                <details class="text-gray-500 float-left">
                    <summary class="cursor-pointer">
                        Description
                    </summary>
                    <div
                        class="whitespace-pre-line absolute border drop-shadow-md rounded bg-white p-2"
                        style="max-width: 300px;"
                    >
                        {{ description }}
                    </div>
                </details>
            </template>
        </div>
        <div
            v-if="active"
            class="flex border border-green-400 rounded-full bg-green-200 py-1 px-2 text-xs"
        >
            <ChipIcon class="w-4 mr-1" />
            <span>active</span>
        </div>
    </div>
</template>

<script>
import { ChipIcon, ClockIcon } from '@heroicons/vue/outline'

export default {
    name: 'SnapshotName',
    components: { ChipIcon, ClockIcon },
    props: {
        id: {
            required: true,
            type: String
        },
        name: {
            required: true,
            type: String
        },
        description: {
            required: true,
            type: String
        },
        targetSnapshot: {
            required: false,
            type: String,
            default: null
        }
    },
    computed: {
        active: function () {
            return this.id === this.targetSnapshot
        }
    }
}
</script>
