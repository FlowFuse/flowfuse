<template>
    <template v-if="user.email_verified">
        <div class="flex flex-col sm:flex-row">
            <SectionSideMenu :options="sideNavigation" />
            <div class="flex-grow">
                <router-view />
            </div>
        </div>
    </template>
    <template v-else>
        Please verify your email address to access teams
    </template>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'

export default {
    name: 'AccountTeams',
    components: {
        SectionSideMenu
    },
    data () {
        return {
            sideNavigation: []
        }
    },
    computed: {
        ...mapState('account', ['user', 'teams']),
        ...mapGetters('account', ['teamInvitationsCount'])
    },
    watch: {
        teamInvitationsCount: {
            handler: function () {
                this.updateInvitations()
            },
            deep: true
        }
    },
    async mounted () {
        this.sideNavigation = [
            { name: 'Teams', path: '/account/teams' }
        ]
        this.sideNavigation.push({ name: 'Invitations', path: '/account/teams/invitations' })
        this.updateInvitations()
    },
    methods: {
        updateInvitations () {
            if (this.teamInvitationsCount > 0) {
                this.sideNavigation[1].name = `Invitations (${this.teamInvitationsCount})`
            } else {
                this.sideNavigation[1].name = 'Invitations'
            }
        }
    }
}
</script>
