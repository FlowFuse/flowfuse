<template>
    <div class="block md:flex">
        <div v-if="!showingMessage" class="flex-grow p-2">
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
        <div v-else class="flex-grow p-2">
            <p>
                Thank you for signing up to FlowForge. You are now able to create projects and use the platform.
            </p>
            <router-link to="./projects/create" class="forge-button pl-1 pr-2 mt-2"><PlusSmIcon class="w-4" /><span class="text-xs">Create Project</span></router-link>
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

import FormHeading from '@/components/FormHeading'
import MemberSummaryList from './components/MemberSummaryList'
import ProjectSummaryList from './components/ProjectSummaryList'
import { PlusSmIcon } from '@heroicons/vue/outline'

export default {
    name: 'TeamOverview',
    props: ['team', 'teamMembership'],
    data: function () {
        return {
            userCount: 0,
            users: null,
            projectCount: 0,
            projects: null,
            show: {
                thankyou: false
            }

        }
    },
    computed: {
        createProjectEnabled: function () {
            return this.teamMembership.role === Roles.Owner
        },
        showingMessage: function () {
            return this.show.thankyou
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
        this.checkBillingSession()
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
            }
        },
        // has the user navigated here directly from Stripe, having just completed payment details
        checkBillingSession () {
            this.show.thankyou = 'billing_session' in this.$route.query
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
