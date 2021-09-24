<template>
    <div class="block md:flex">
        <div class="flex-grow p-2">
            <FormHeading>
                <router-link to="./projects">Projects</router-link>
                <template v-slot:tools>
                    <router-link to="./projects/create" class="forge-button pl-1 pr-2"><PlusSmIcon class="w-4" /><span class="text-xs">Create Project</span></router-link>
                    <router-link to="./projects" class="forge-button-tertiary ml-2 px-1"><DotsHorizontalIcon class="w-4" /></router-link>
                </template>
            </FormHeading>
            <ProjectSummaryList :projects="projects" :team="team" />
        </div>
        <div class="md:w-48 p-2 md:ml-8">
            <FormHeading>
                Members
                <template v-slot:tools>
                    <router-link to="./members" class="forge-button-tertiary px-2"><UsersIcon class="w-4" /></router-link></template>
            </FormHeading>
            <MemberSummaryList :team="team" />
        </div>
    </div>
</template>

<script>

import teamApi from '@/api/team'
import FormHeading from '@/components/FormHeading'
import MemberSummaryList from './MemberSummaryList'
import ProjectSummaryList from '@/components/ProjectSummaryList'
import { PlusSmIcon, UsersIcon, DotsHorizontalIcon } from '@heroicons/vue/outline'

export default {
    name: 'TeamOverview',
    props:[ "team" ],
    data: function() {
        return {
            projectCount: 0,
            projects: null
        }
    },
    watch: {
         team: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        fetchData: async function(newVal,oldVal) {
            if (this.team.slug) {
                const data = await teamApi.getTeamProjects(this.team.slug)
                this.projectCount = data.count;
                this.projects = data.projects;
            }
        }
    },
    components: {
        FormHeading,
        MemberSummaryList,
        ProjectSummaryList,
        DotsHorizontalIcon,
        UsersIcon,
        PlusSmIcon
    }
}
</script>
