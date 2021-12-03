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
import { mapState } from 'vuex'

export default {
    name: 'AccountTeams',
    components: {
        SectionSideMenu
    },
    computed: {
        ...mapState('account',['user','teams']),
    },
    data() {
        return {
            sideNavigation: [
                { name: "Teams", path: "/account/teams" },
                { name: "Invitations", path: "/account/teams/invitations" }
            ]
        }
    }
}
</script>
