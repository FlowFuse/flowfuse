import { mapState } from 'pinia'

import { useAccountStore } from '@/stores'
import { useContextStore } from '@/stores/context.js'

export default {
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountStore, ['defaultUserTeam']),
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
