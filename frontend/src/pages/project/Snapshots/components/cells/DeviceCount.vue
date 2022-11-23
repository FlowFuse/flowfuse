<template>
    <div class="flex items-center">
        <div
            v-if="active"
            v-ff-tooltip="'This is the active snapshot, configured to deploy to all devices'"
            class="flex border text-green-700 border-green-400 rounded-full bg-green-200 py-1 px-2 text-xs"
        >
            <ChipIcon class="w-4 mr-1" />
            <span>Deployed to {{ deviceCount || 0 }} Devices</span>
        </div>
        <div
            v-if="deviceCount > 0 && !active"
            v-ff-tooltip="'This snapshot, despite no longer being the target snapshot, is deployed to some devices. Check the connectivity of these devices.'"
            class="flex border text-yellow-600 border-yellow-400 rounded-full bg-yellow-100 py-1 px-2 text-xs"
        >
            <ExclamationIcon class="w-4 mr-1" />
            <span>Deployed to {{ deviceCount }} Devices</span>
        </div>
    </div>
</template>

<script>
import { ChipIcon, ExclamationIcon } from '@heroicons/vue/outline'

export default {
    name: 'DeviceCount',
    components: { ChipIcon, ExclamationIcon },
    props: {
        id: {
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
