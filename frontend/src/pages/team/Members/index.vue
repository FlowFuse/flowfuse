<template>
    <div class="">
        <SectionTopMenu hero="Members" :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :team="team" :teamMembership="teamMembership" @invites-updated="checkAccess()"></router-view>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import teamApi from '@/api/team'

import SectionTopMenu from '@/components/SectionTopMenu'
import { Roles } from '@core/lib/roles'

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
            if (this.teamMembership.role >= Roles.Owner) {
                const invitations = await teamApi.getTeamInvitations(this.team.id)
                this.sideNavigation.push({ name: `Invitations (${invitations.count})`, path: './invitations' })
            }
        }
    }
}
</script>
