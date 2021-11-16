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
    { name: "Members", path: "./general" },
    { name: "Invitations", path: "./invitations" }
]
export default {
    name: 'TeamUsers',
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
