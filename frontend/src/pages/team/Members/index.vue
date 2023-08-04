<template>
    <ff-page>
        <template #header>
            <ff-page-header :tabs="navigation">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb>Members</ff-nav-breadcrumb>
                </template>
                <template #context>
                    View and manage the members of your team.
                </template>
            </ff-page-header>
        </template>
        <div class="flex-grow">
            <router-view :team="team" :teamMembership="teamMembership" :inviteCount="inviteCount" @invites-updated="checkAccess()"></router-view>
        </div>
    </ff-page>
</template>

<script>
import { mapState } from 'vuex'

import teamApi from '../../../api/team.js'

import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'TeamUsers',
    props: ['team', 'teamMembership'],
    mixins: [permissionsMixin],
    computed: {
        ...mapState('account', ['user'])
    },
    data: function () {
        return {
            navigation: [],
            inviteCount: 0
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
            this.navigation = [
                { label: 'Team Members', to: './general' }
            ]
            if (this.hasPermission('team:user:invite')) {
                const invitations = await teamApi.getTeamInvitations(this.team.id)
                this.inviteCount = invitations.count
                this.navigation.push({
                    label: `Invitations (${invitations.count})`, to: './invitations'
                })
            }
        }
    }
}
</script>
