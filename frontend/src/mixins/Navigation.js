import { mapState } from 'vuex'

export default {
    computed: {
        ...mapState('account', ['team', 'defaultUserTeam'])
    },
    methods: {
        homeLink () {
            if (this.team?.slug) {
                return { name: 'Team', params: { team_slug: this.team.slug } }
            } else if (this.defaultUserTeam?.slug) {
                return { name: 'Team', params: { team_slug: this.defaultUserTeam?.slug } }
            } else {
                return { name: 'Home' }
            }
        },
        signOut () {
            this.$router.push({ name: 'Sign out' })
        }
    }
}
