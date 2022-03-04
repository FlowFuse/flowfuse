<template>
    <div class="block md:flex">
        <div class="flex-grow p-2">
            <FormHeading>
                <router-link to="./projects">Projects</router-link>
                <template v-if="createProjectEnabled" v-slot:tools>
                    <router-link to="./projects/create" class="forge-button pl-1 pr-2"><PlusSmIcon class="w-4" /><span class="text-xs">Create Project</span></router-link>
                </template>
            </FormHeading>
            <template v-if="projectCount > 0">
                <ProjectSummaryList :projects="projects" :team="team" />
            </template>
            <template v-else>
                <div class="flex text-gray-500 justify-center italic mb-4 p-8">
                    You don't have any projects yet
                </div>
            </template>
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

import { Roles } from '@core/lib/roles'

import teamApi from '@/api/team'
import billingApi from '@/api/billing'

import FormHeading from '@/components/FormHeading'
import MemberSummaryList from './components/MemberSummaryList'
import ProjectSummaryList from './components/ProjectSummaryList'
import { PlusSmIcon, UsersIcon, ChevronRightIcon } from '@heroicons/vue/outline'
import CreateProjectButton from '@/components/CreateProjectButton'

export default {
    name: 'TeamOverview',
    props: ['team', 'teamMembership'],
    data: function () {
        return {
            userCount: 0,
            users: null,
            projectCount: 0,
            projects: null

        }
    },
    computed: {
        createProjectEnabled: function () {
            return this.teamMembership.role === Roles.Owner
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function (newVal, oldVal) {
            if (this.team.slug) {
                // Team Data
                const data = await teamApi.getTeamProjects(this.team.id)
                this.projectCount = data.count
                this.projects = data.projects
                // Team Members
                const members = await teamApi.getTeamMembers(this.team.id)
                this.userCount = members.count
                this.users = members.members
                // Team Billing
                try {
                    const subscription = await billingApi.getSubscriptionInfo(this.team.id)
                    console.log(subscription)
                } catch {
                    // if 404 - no billing setup, but are we running in EE?
                    console.log('NO BILLING CONFIGURED')
                }
            }
        }
    },
    components: {
        FormHeading,
        MemberSummaryList,
        ProjectSummaryList,
        PlusSmIcon
    }
}
</script>
