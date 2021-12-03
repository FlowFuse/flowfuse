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
import { Roles } from '@/utils/roles'

// const sideNavigation = [
//     { name: "Members", path: "./general" },
//     { name: "Invitations", path: "./invitations" }
// ]
export default {
    name: 'TeamUsers',
    props:[ "team", "teamMembership" ],
    components: {
        SectionSideMenu
    },
    data: function() {
        return {
            sideNavigation: []
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
            this.sideNavigation = [
                { name: "Members", path: "./general" }
            ]
            if (this.teamMembership && this.teamMembership.role === Roles.Owner) {
                this.sideNavigation.push({ name: "Invitations", path: "./invitations" })
            }
        }
    }
}
</script>
