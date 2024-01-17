<template>
    <router-link
        :to="{ name: 'Device', params: { id: id } }"
        class="flex"
    >
        <DeviceModeBadge :mode="mode" type="icon" class="flex flex-col justify-center mr-2" />
        <div class="flex flex-col">
            <span class="text-lg">{{ name }}</span>
            <span class="text-xs text-gray-500">id: {{ id }}</span>
        </div>
    </router-link>
</template>

<script>
import DeviceModeBadge from '../../../device/components/DeviceModeBadge.vue'

export default {
    name: 'DeviceLink',
    components: { DeviceModeBadge },
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
