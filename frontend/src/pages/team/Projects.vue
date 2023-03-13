<template>
    <SectionTopMenu hero="Applications">
    </SectionTopMenu>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Applications..." />
        <template v-else-if="projects.length > 0">
            <ff-data-table data-el="projects-table" :columns="columns" :rows="projects" :show-search="true" search-placeholder="Search Applications..."
                           :rows-selectable="true" @row-selected="openProject"
            >
                <template #actions>
                    <ff-button data-action="create-project-1"
                               v-if="hasPermission('project:create')"
                               kind="primary"
                               to="./projects/create" data-nav="create-project">
                        <template v-slot:icon-left>
                            <PlusSmIcon />
                        </template>
                        Create Application
                    </ff-button>
                    <!-- <ff-button data-action="create-project" to="./projects/create">
                                <template v-slot:icon-right>
                                    <PlusSmIcon />
                                </template>
                                Create Application
                            </ff-button> -->
                </template>
            </ff-data-table>
        </template>
        <template v-else-if="hasPermission('project:create') && !loading">
            <div class="flex justify-center mb-4 p-8">
                <ff-button data-action="create-project-2" to="./projects/create">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Create Application
                </ff-button>
            </div>
        </template>
        <template v-else>
            <div class="flex text-gray-500 justify-center italic mb-4 p-8">
                You don't have any applications yet
            </div>
        </template>
    </div>
    <router-view></router-view>
</template>

<script>
import { markRaw } from 'vue'
import permissionsMixin from '@/mixins/Permissions'

import teamApi from '@/api/team'
import { PlusSmIcon } from '@heroicons/vue/outline'
import SectionTopMenu from '@/components/SectionTopMenu'

import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'

export default {
    name: 'TeamProjects',
    mixins: [permissionsMixin],
    data () {
        return {
            loading: false,
            projects: [],
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true },
                { label: 'Status', class: ['w-44'], key: 'status', sortable: true, component: { is: markRaw(ProjectStatusBadge) } },
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
                const data = await teamApi.getTeamProjects(this.team.id)
                this.projects = data.projects
            }
            this.loading = false
        },
        openProject (project) {
            this.$router.push({
                name: 'Project',
                params: {
                    id: project.id
                }
            })
        }
    },
    props: ['team', 'teamMembership'],
    components: {
        PlusSmIcon,
        SectionTopMenu
    }
}
</script>
