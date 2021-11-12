<template>
    <div class="block md:flex">
        <div class="flex-grow p-2">
            <FormHeading>
                <router-link to="./projects">Projects</router-link>
                <template v-slot:tools>
                    <router-link to="./projects/create" class="forge-button pl-1 pr-2"><PlusSmIcon class="w-4" /><span class="text-xs">Create Project</span></router-link>
                </template>
            </FormHeading>
            <ProjectSummaryList :projects="projects" :team="team" />
        </div>
        <div class="md:w-48 p-2 md:ml-8">
            <FormHeading>
                <router-link to="./members">Members</router-link>
            </FormHeading>
            <MemberSummaryList :users="users" />
        </div>
    </div>
</template>

<script>

import teamApi from '@/api/team'
import FormHeading from '@/components/FormHeading'
import MemberSummaryList from './components/MemberSummaryList'
import ProjectSummaryList from './components/ProjectSummaryList'
import { PlusSmIcon, UsersIcon, ChevronRightIcon } from '@heroicons/vue/outline'

export default {
    name: 'TeamOverview',
    props:[ "team" ],
    data: function() {
        return {
            userCount: 0,
            users: null,
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
                const data = await teamApi.getTeamProjects(this.team.id)
                this.projectCount = data.count;
                this.projects = data.projects;
                const members = await teamApi.getTeamMembers(this.team.id)
                this.userCount = members.count;
                this.users = members.members;
            }
        }
    },
    components: {
        FormHeading,
        MemberSummaryList,
        ProjectSummaryList,
        ChevronRightIcon,
        UsersIcon,
        PlusSmIcon
    }
}
</script>
