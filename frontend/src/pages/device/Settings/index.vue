<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :device="device" @deviceUpdated="$emit('device-updated')"></router-view>
        </div>
    </div>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'

const sideNavigation = [
    { name: 'General', path: './general' },
    { name: 'Environment', path: './environment' },
    { name: 'Danger', path: './danger' }
]

export default {
    name: 'DeviceSettins',
    props: ['device'],
    emits: ['device-updated'],
    setup () {
        return {
            sideNavigation
        }
    },
    components: {
        SectionSideMenu
    }
}
</script>
