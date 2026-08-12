import { mapState } from 'pinia'

import { useContextStore } from '@/stores/context.js'
import { useDataFarmTeamsStore } from '@/stores/data-farm-teams'

export default {
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useDataFarmTeamsStore, ['defaultUserTeam']),
        homeLink () {
            if (this.team?.slug) {
                return { name: 'team', params: { team_slug: this.team.slug } }
            } else if (this.defaultUserTeam?.slug) {
                return { name: 'team', params: { team_slug: this.defaultUserTeam?.slug } }
            } else {
                return { name: 'home' }
            }
        }
    },
    methods: {
        signOut () {
            this.$router.push({ name: 'sign-out' })
        }
    }
}
