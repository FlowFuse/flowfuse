<template>
    <ff-loading v-if="loading" />
    <div v-else class="block md:flex">
        <div class="flex-grow">
            <SectionTopMenu hero="Applications">
                <template v-if="hasPermission('project:create')" v-slot:tools>
                    <ff-button kind="primary" to="./projects/create" data-nav="create-project"><template v-slot:icon-left><PlusSmIcon /></template>Create Application</ff-button>
                </template>
            </SectionTopMenu>
            <template v-if="applicationCount > 0">
                <ProjectSummaryList :projects="applications" :team="team" />
            </template>
            <template v-else>
                <div v-if="!showingMessage" class="flex text-gray-500 justify-center italic mb-4 p-8">
                    You don't have any applications yet
                </div>
                <div v-else class="mb-4 p-8 mx-auto text-center">
                    <strong class="mb-2 block">Thank you for signing up to FlowForge!</strong>You are now able to create applications and use the platform.
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

import permissionsMixin from '@/mixins/Permissions'

import teamApi from '@/api/team'

import SectionTopMenu from '@/components/SectionTopMenu'
import MemberSummaryList from './components/MemberSummaryList'
import ProjectSummaryList from './components/ProjectSummaryList'
import { PlusSmIcon } from '@heroicons/vue/outline'

export default {
    name: 'TeamOverview',
    props: ['team', 'teamMembership'],
    mixins: [permissionsMixin],
    data: function () {
        return {
            loading: false,
            userCount: 0,
            users: null,
            applicationCount: 0,
            applications: null,
            show: {
                thankyou: false
            }

        }
    },
    computed: {
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
                const applicationsPromise = teamApi.getTeamApplications(this.team.id)
                const membersPromise = await teamApi.getTeamMembers(this.team.id)

                Promise.all([applicationsPromise, membersPromise]).finally(() => {
                    this.loading = false
                })

                // Applications
                this.applicationCount = (await applicationsPromise).count
                this.applications = (await applicationsPromise).applications

                // Team Members
                this.userCount = (await membersPromise).count
                this.users = (await membersPromise).members
            }
        },
        // has the user navigated here directly from Stripe, having just completed payment details
        async checkBillingSession () {
            this.show.thankyou = 'billing_session' in this.$route.query
            if (this.show.thankyou) {
                // delete
                document.cookie = 'ff_coupon=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            }
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
