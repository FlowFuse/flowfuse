<template>
    <div class="">
        <SectionTopMenu hero="Members" :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :team="team" :teamMembership="teamMembership"></router-view>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionTopMenu from '@/components/SectionTopMenu'
import { Roles } from '@core/lib/roles'

// const sideNavigation = [
//     { name: "Members", path: "./general" },
//     { name: "Invitations", path: "./invitations" }
// ]
export default {
    name: 'TeamUsers',
    props: ['team', 'teamMembership'],
    computed: {
        ...mapState('account', ['user'])
    },
    components: {
        SectionTopMenu
    },
    data: function () {
        return {
            sideNavigation: []
        }
    },
    watch: {
        teamMembership: 'checkAccess'
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            this.sideNavigation = [
                { name: 'Team Members', path: './general' }
            ]
            if (this.user.admin || (this.teamMembership && this.teamMembership.role === Roles.Owner)) {
                this.sideNavigation.push({ name: 'Invitations', path: './invitations' })
            }
        }
    }
}
</script>
