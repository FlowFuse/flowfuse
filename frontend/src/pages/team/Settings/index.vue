<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :team="team" :teamMembership="teamMembership"></router-view>
        </div>
    </div>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'
import { useRoute, useRouter } from 'vue-router';

const sideNavigation = [
    { name: "General", path: "./general" },
    { name: "Permissions", path: "./permissions" },
    { name: "Danger", path: "./danger" }
]


export default {
    name: 'TeamSettings',
    props:[ "team", "teamMembership" ],
    components: {
        SectionSideMenu
    },
    setup() {
        return {
            sideNavigation
        }
    },
    watch: {
         teamMembership: 'checkAccess'
    },
    mounted() {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function() {
            if (this.teamMembership && this.teamMembership.role !== "owner") {
                useRouter().push({ path: `/team/${useRoute().params.id}/overview` })
            }
        }
    }
}
</script>
