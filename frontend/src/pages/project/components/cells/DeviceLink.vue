<template>
    <router-link
        :to="{ name: 'Device', params: { id: id } }"
        class="flex"
    >
        <ChipIcon class="w-6 mr-2 text-gray-500" />
        <div class="flex flex-col space-y-1">
            <span class="text-lg">{{ name }}</span>
            <span class="text-xs text-gray-500">id: {{ id }}</span>
        </div>
    </router-link>
</template>

<script>
import { ChipIcon } from '@heroicons/vue/solid'

export default {
    name: 'DeviceLink',
    components: { ChipIcon },
    props: {
        id: {
            required: true,
            type: String
        },
        name: {
            type: String,
            required: true
        }

    }
}
</script>
