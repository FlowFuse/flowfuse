<template>
    <template v-if="user.email_verified">
        <div class="flex flex-col sm:flex-row">
            <SectionSideMenu :options="sideNavigation" />
            <div class="flex-grow">
                <router-view></router-view>
            </div>
        </div>
    </template>
    <template v-else>
        Please verify your email address to access teams
    </template>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'
import { mapState, mapGetters } from 'vuex'

export default {
    name: 'AccountTeams',
    components: {
        SectionSideMenu
    },
    computed: {
        ...mapState('account', ['user', 'teams']),
        ...mapGetters('account', ['notifications'])
    },
    data () {
        return {
            sideNavigation: []
        }
    },
    watch: {
        notifications: {
            handler: function () {
                this.updateNotifications()
            },
            deep: true
        }
    },
    async mounted () {
        this.sideNavigation = [
            { name: 'Teams', path: '/account/teams' }
        ]
        this.sideNavigation.push({ name: 'Invitations', path: '/account/teams/invitations' })
        this.updateNotifications()
    },
    methods: {
        updateNotifications () {
            if (this.notifications.invitations > 0) {
                this.sideNavigation[1].name = `Invitations (${this.notifications.invitations})`
            } else {
                this.sideNavigation[1].name = 'Invitations'
            }
        }
    }
}
</script>
