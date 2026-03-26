import { mapState } from 'pinia'

import { useAccountTeamStore } from '@/stores'

export default {
    computed: {
        ...mapState(useAccountTeamStore, ['team', 'defaultUserTeam']),
        homeLink () {
            if (this.team?.slug) {
                return { name: 'Team', params: { team_slug: this.team.slug } }
            } else if (this.defaultUserTeam?.slug) {
                return { name: 'Team', params: { team_slug: this.defaultUserTeam?.slug } }
            } else {
                return { name: 'Home' }
            }
        }
    },
    methods: {
        signOut () {
            this.$router.push({ name: 'Sign out' })
        }
    }
}
