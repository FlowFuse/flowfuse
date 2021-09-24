<template>
    <div class="mx-auto flex items-center justify-center py-36">
        <div class="w-92 text-gray-600 opacity-50"><Logo /></div>
    </div>
</template>

<script>

import projectApi from '@/api/project'
import teamApi from '@/api/team'
import { mapState } from 'vuex'
import TeamsTable from '@/components/tables/TeamsTable'
import FormHeading from '@/components/FormHeading'
import CreateProjectButton from "@/components/CreateProjectButton"
import ProjectSummaryList from '@/components/ProjectSummaryList'
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
        team: 'redirectOnLoad'
    },
    created() {
        this.redirectOnLoad();
    },
    methods: {
        redirectOnLoad() {
            if (this.team) {
                this.$router.push({name:"Team", params:{id:this.team.slug}});
            }
        }
    },
    components: {
        ProjectSummaryList,
        TeamsTable,
        FormHeading,
        CreateProjectButton,
        Logo
    }
}
</script>
