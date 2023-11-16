<template>
    <router-link
        :to="{ name: 'Device', params: { id: id } }"
        class="flex"
    >
        <span v-if="mode === 'developer'" v-ff-tooltip="'Developer Mode'" class="flex flex-col space-y-2">
            <BeakerIcon class="text-purple-600 w-6 mr-2 flex-auto" />
        </span>
        <span v-else class="flex flex-col space-y-2 mr-2">
            <IconDeviceSolid class="text-teal-700 ff-icon ff-icon-lg flex-auto" />
        </span>
        <div class="flex flex-col">
            <span class="text-lg">{{ name }}</span>
            <span class="text-xs text-gray-500">id: {{ id }}</span>
        </div>
    </router-link>
</template>

<script>
import { BeakerIcon } from '@heroicons/vue/solid'

import IconDeviceSolid from '../../../../components/icons/DeviceSolid.js'

export default {
    name: 'DeviceLink',
    components: { IconDeviceSolid, BeakerIcon },
    inheritAttrs: false,
    props: {
        id: {
            required: true,
            type: String
        },
        name: {
            type: String,
            required: true
        },
        mode: {
            type: String,
            required: true
        }

    }
}
</script>
