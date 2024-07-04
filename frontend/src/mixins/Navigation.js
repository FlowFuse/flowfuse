import { mapState } from 'vuex'

export default {
    computed: {
        ...mapState('account', ['team'])
    },
    methods: {
        home () {
            if (this.team?.slug) {
                this.$router.push({ name: 'Team', params: { team_slug: this.team.slug } })
            } else if (this.defaultUserTeam?.slug) {
                this.$router.push({ name: 'Team', params: { team_slug: this.defaultUserTeam?.slug } })
            } else {
                this.$router.push({ name: 'Home' })
            }
        },
        signOut () {
            this.$router.push({ name: 'Sign out' })
        }
    }
}
