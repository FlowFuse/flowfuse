<template>
    <SectionTopMenu hero="Settings" :options="sideNavigation" />
    <div class="flex-grow">
        <router-view ></router-view>
    </div>
</template>

<script>
import SectionTopMenu from '@/components/SectionTopMenu'

const sideNavigation = [
    { name: 'General', path: './general' },
    // { name: "Permissions", path: "./permissions" },
    { name: 'License', path: './license' },
    { name: 'Email', path: './email' }
]

export default {
    name: 'AdminSettings',
    setup () {
        return {
            sideNavigation
        }
    },
    data () {
        return {
        }
    },
    components: {
        SectionTopMenu
    }
}
</script>
