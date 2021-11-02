<template>
    <div class="mx-auto flex items-center justify-center py-36">
        <div class="w-92 text-gray-600 opacity-50"><Logo /></div>
    </div>
</template>

<script>

import { mapState } from 'vuex'
import Logo from "@/components/Logo"

export default {
    name: 'Home',
    computed: {
        ...mapState('account',['user','team','teams']),
    },
    data() {
        return {
            projects: []
        }
    },
    watch: {
        team: 'redirectOnLoad',
        teams: 'redirectOnLoad'
    },
    created() {
        this.redirectOnLoad();
    },
    methods: {
        redirectOnLoad() {
            if (this.team) {
                this.$router.push({name:"Team", params:{id:this.team.slug}});
            } else if (this.teams && this.teams.length > 0) {
                this.$store.dispatch('account/setTeam',this.teams[0]);
                this.$router.push({name:"Team",params:{id:this.teams[0].slug}})
            }
        }
    },
    components: {
        Logo
    }
}
</script>
