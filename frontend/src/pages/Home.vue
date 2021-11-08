<template>
    <template v-if="pending">
    <div class="flex-grow flex flex-col items-center justify-center mx-auto text-gray-600 opacity-50">
        <Logo class="max-w-xs mx-auto w-full"/>
    </div>
    </template>
    <NoTeamsUser v-else/>
</template>

<script>

import { mapState } from 'vuex'
import Logo from "@/components/Logo"
import NoTeamsUser from "./NoTeamsUser"

export default {
    name: 'Home',
    computed: {
        ...mapState('account',['pending','user','team','teams']),
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
            console.log(this.teams)
            if (this.team) {
                this.$router.push({name:"Team", params:{id:this.team.slug}});
            } else if (this.teams && this.teams.length > 0) {
                this.$store.dispatch('account/setTeam',this.teams[0]);
                this.$router.push({name:"Team",params:{id:this.teams[0].slug}})
            }
        }
    },
    components: {
        Logo,
        NoTeamsUser
    }
}
</script>
