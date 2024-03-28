<template>
    <div class="flex items-center">
        <ClockIcon class="w-6 mr-2 text-gray-500" />
        <div class="flex flex-col space-y-1 ml-3">
            <span class="text-base">{{ name }}</span>
            <span class="text-xs text-gray-400">id: {{ id }}</span>
            <template v-if="description">
                <details class="text-gray-500 float-left">
                    <summary class="cursor-pointer">
                        Description
                    </summary>
                    <div
                        class="whitespace-pre-line absolute border drop-shadow-md rounded bg-white p-2 z-10"
                        style="max-width: 300px;"
                    >
                        {{ description }}
                    </div>
                </details>
            </template>
        </div>
    </div>
</template>

<script>
import { ClockIcon } from '@heroicons/vue/outline'

export default {
    name: 'SnapshotName',
    components: { ClockIcon },
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
        deviceCount: {
            required: false,
            type: Number,
            default: null
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
