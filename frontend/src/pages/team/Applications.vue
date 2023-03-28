<template>
    <SectionTopMenu hero="Applications" />
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Applications..." />
        <template v-else>
            <ff-data-table
                data-el="projects-table" :columns="columns" :rows="applications" :show-search="true" search-placeholder="Search Applications..."
                :rows-selectable="true" @row-selected="openApplication"
            >
                <template #actions>
                    <ff-button
                        v-if="hasPermission('project:create')"
                        data-action="create-project-1"
                        kind="primary"
                        :to="{name: 'CreateTeamApplication'}" data-nav="create-project"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Create Application
                    </ff-button>
                </template>
                <template v-if="applications.length == 0" #table>
                    <div class="ff-no-data ff-no-data-large">
                        You don't have any applications yet
                    </div>
                </template>
            </ff-data-table>
        </template>
    </div>
    <router-view />
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
// import { markRaw } from 'vue'

import teamApi from '@/api/team'
import SectionTopMenu from '@/components/SectionTopMenu'
import permissionsMixin from '@/mixins/Permissions'

// import ProjectStatusBadge from '@/pages/application/components/ProjectStatusBadge'

export default {
    name: 'TeamProjects',
    components: {
        PlusSmIcon,
        SectionTopMenu
    },
    mixins: [permissionsMixin],
    props: ['team', 'teamMembership'],
    data () {
        return {
            loading: false,
            applications: [],
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true },
                // { label: 'Status', class: ['w-44'], key: 'status', sortable: true, component: { is: markRaw(ProjectStatusBadge) } },
                { label: 'Updated', class: ['w-44', 'text-xs'], key: 'updatedSince', sortable: true }
            ]
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function (newVal) {
            this.loading = true
            if (this.team.id) {
                const data = await teamApi.getTeamApplications(this.team.id)
                this.applications = data.applications
            }
            this.loading = false
        },
        openApplication (application) {
            this.$router.push({
                name: 'Application',
                params: {
                    id: application.id
                }
            })
        }
    }
}
</script>
