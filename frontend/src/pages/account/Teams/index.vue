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
import { mapState } from 'pinia'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountStore } from '@/stores/account.js'

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
        ...mapState(useAccountStore, ['teamInvitationsCount']),
        ...mapState(useAccountAuthStore, ['user'])
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
            { name: 'Teams', path: { name: 'user-teams' } }
        ]
        this.sideNavigation.push({ name: 'Invitations', path: { name: 'user-invitations' } })
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
