<template>
    <ul class="grid grid-cols-3 space-x-2">
        <li
            v-for="os in ['Windows', 'MacOS', 'Linux']"
            :key="os"
            class="p-4 mb-2 border rounded bg-white border-gray-200 cursor-pointer flex items-center justify-center space-x-2"
            :class="{ 'border-blue-600': selectedOS === os }"
            @click.stop="$emit('select-os', os)"
        >
            <img :src="osIcons[os]" class="w-5 h-5" :alt="os + ' icon'">
            <span>{{ os }}</span>
        </li>
    </ul>
</template>

<script>
import LinuxIcon from '../../../../../../assets/icons/linux.svg'
import MacOSIcon from '../../../../../../assets/icons/macos.svg'
import WindowsIcon from '../../../../../../assets/icons/windows.svg'

export default {
    name: 'OSSelector',
    props: {
        selectedOS: {
            required: true,
            type: String
        }
    },
    emits: ['select-os'],
    data () {
        return {
            osIcons: {
                Windows: WindowsIcon,
                MacOS: MacOSIcon,
                Linux: LinuxIcon
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
