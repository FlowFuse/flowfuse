<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.members')" :tabs="navigation">
                <template #context>
                    {{ $t('ui.viewAndManageTheMembersOfYourTeam') }}
                </template>
            </ff-page-header>
        </template>
        <div class="grow">
            <router-view :inviteCount="inviteCount" @invites-updated="checkAccess()" />
        </div>
    </ff-page>
</template>

<script>

import { mapState } from 'pinia'

import teamApi from '../../../api/team.js'
import usePermissions from '../../../composables/Permissions.js'

import { t } from '../../../i18n.js'

import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamUsers',
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data: function () {
        return {
            navigation: [],
            inviteCount: 0
        }
    },
    computed: {
        ...mapState(useContextStore, ['team'])
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
                { label: t('ui.teamMembers2'), to: './general' }
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
