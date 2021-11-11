<template>
    <template v-if="pending">
    <div class="flex-grow flex flex-col items-center justify-center mx-auto text-gray-600 opacity-50">
        <Logo class="max-w-xs mx-auto w-full"/>
    </div>
    </template>
    <template v-if="teams.length === 0">
        <NoTeamsUser/>
    </template>
</template>

<script>

import { mapState } from 'vuex'
import Logo from "@/components/Logo"
import NoTeamsUser from "./NoTeamsUser"
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'Home',
    mixins: [ Breadcrumbs ],
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
        this.clearBreadcrumbs();
        this.redirectOnLoad();
    },
    methods: {
        redirectOnLoad() {
            if (this.team) {
                this.$router.push({name:"Team", params:{id:this.team.slug}});
            } else if (this.teams && this.teams.length > 0) {
                this.$store.dispatch('account/setTeam',this.teams[0]);
                this.$router.push({name:"Team",params:{id:this.teams[0].slug}})
            // } else if (!this.pending && this.teams && this.teams.length === 0) {
            //     this.$router.push({path:"/team/create"})
            }
        }
    },
    components: {
        Logo,
        NoTeamsUser
    }
}
</script>
