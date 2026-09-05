<template>
    <template v-if="user.email_verified">
        <div class="flex flex-col sm:flex-row">
            <SectionSideMenu :options="sideNavigation" />
            <div class="grow">
                <router-view />
            </div>
        </div>
    </template>
    <template v-else>
        {{ $t('ui.pleaseVerifyYourEmailAddressToAccessTeams') }}
    </template>
</template>

<script>
import { mapState } from 'pinia'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'

import { t } from '../../../i18n.js'

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
            { name: t('ui.tabTeams'), path: { name: 'user-teams' } }
        ]
        this.sideNavigation.push({ name: t('ui.tabInvitations'), path: { name: 'user-invitations' } })
        this.updateInvitations()
    },
    methods: {
        updateInvitations () {
            if (this.teamInvitationsCount > 0) {
                this.sideNavigation[1].name = `Invitations (${this.teamInvitationsCount})`
            } else {
                this.sideNavigation[1].name = t('ui.tabInvitations')
            }
        }
    }
}
</script>
