<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :team="team"></router-view>
        </div>
    </div>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'

const sideNavigation = [
    { name: "General", path: "./general" },
    { name: "Permissions", path: "./permissions" },
    { name: "Danger", path: "./danger" }
]


export default {
    name: 'TeamSettings',
    props:[ "team" ],
    components: {
        SectionSideMenu
    },
    setup() {
        return {
            sideNavigation
        }
    }
}
</script>
