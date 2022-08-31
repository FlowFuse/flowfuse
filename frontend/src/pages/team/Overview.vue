<template>
    <ff-loading v-if="loading" />
    <div v-else class="block md:flex">
        <div class="flex-grow">
            <SectionTopMenu hero="Projects">
                <template v-if="createProjectEnabled" v-slot:tools>
                    <ff-button v-if="createProjectEnabled" kind="primary" size="small" to="./projects/create" data-nav="create-project"><template v-slot:icon-left><PlusSmIcon /></template>Create Project</ff-button>
                </template>
            </SectionTopMenu>
            <template v-if="projectCount > 0">
                <ProjectSummaryList :projects="projects" :team="team" />
            </template>
            <template v-else>
                <div v-if="!showingMessage" class="flex text-gray-500 justify-center italic mb-4 p-8">
                    You don't have any projects yet
                </div>
                <div v-else class="mb-4 p-8 mx-auto text-center">
                    <strong class="mb-2 block">Thank you for signing up to FlowForge!</strong>You are now able to create projects and use the platform.
                </div>
            </template>
        </div>
        <div class="md:w-48 md:ml-8 mt-8 md:mt-0">
            <SectionTopMenu hero="Members" />
            <MemberSummaryList :users="users" />
        </div>
    </div>
</template>

<script>

import { Roles } from '@core/lib/roles'

import teamApi from '@/api/team'

import SectionTopMenu from '@/components/SectionTopMenu'
import MemberSummaryList from './components/MemberSummaryList'
import ProjectSummaryList from './components/ProjectSummaryList'
import { PlusSmIcon } from '@heroicons/vue/outline'

export default {
    name: 'TeamOverview',
    props: ['team', 'teamMembership'],
    data: function () {
        return {
            loading: false,
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
            this.loading = true
            if (this.team.slug) {
                // Team Data
                const data = await teamApi.getTeamProjects(this.team.id)
                    .then((data) => {
                        this.projectCount = data.count
                        this.projects = data.projects
                    }).catch(() => {})

                // Team Members
                const members = await teamApi.getTeamMembers(this.team.id)
                    .then((members) => {
                        this.userCount = members.count
                        this.users = members.members
                    }).catch(() => {})

                Promise.all([data, members]).finally(() => {
                    this.loading = false
                })
            }
        },
        // has the user navigated here directly from Stripe, having just completed payment details
        checkBillingSession () {
            this.show.thankyou = 'billing_session' in this.$route.query
        }
    },
    components: {
        SectionTopMenu,
        MemberSummaryList,
        ProjectSummaryList,
        PlusSmIcon
    }
}
</script>
