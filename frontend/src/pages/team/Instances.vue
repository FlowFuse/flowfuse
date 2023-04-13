<template>
    <SectionTopMenu hero="Instances" />
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Instances..." />
        <template v-else>
            <ff-data-table v-if="instances.length > 0"
                data-el="instances-table" :columns="columns" :rows="instances" :show-search="true" search-placeholder="Search Instances..."
                :rows-selectable="true" @row-selected="openInstance"
            >
            </ff-data-table>
            <EmptyState v-else>
                <template #header>Get Started with your First Node-RED Instance</template>
                <template #message>
                    <p>
                        Instances are managed in FlowForge via <router-link class="ff-link"
                        :to="{name:'Applications', params: {team_slug: team.slug}}">Applications</router-link> .
                    </p>
                    <p>
                        You can create your first Instance when creating your first Application.
                    </p>
                </template>
                <template #actions>
                    <ff-button
                        v-if="hasPermission('project:create')"
                        kind="primary"
                        :to="{name: 'CreateTeamApplication'}"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Create Instance
                    </ff-button>
                </template>
            </EmptyState>
        </template>
    </div>
</template>

<script>
import { markRaw } from 'vue'
import { PlusSmIcon } from '@heroicons/vue/outline'

import teamApi from '../../api/team.js'
import EmptyState from '../../components/EmptyState.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import permissionsMixin from '../../mixins/Permissions.js'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'TeamInstances',
    components: {
        PlusSmIcon,
        EmptyState,
        SectionTopMenu
    },
    mixins: [permissionsMixin],
    props: {
        team: {
            type: Object,
            required: true
        },
        teamMembership: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            loading: false,
            instances: [],
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true },
                { label: 'Status', class: ['w-44'], key: 'status', sortable: true, component: { is: markRaw(InstanceStatusBadge) } },
                { label: 'Last Updated', class: ['w-60'], key: 'flowLastUpdatedSince', sortable: true },
                { label: 'Application', class: ['flex-grow-[0.25]'], key: 'application.name', sortable: true }
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
                this.instances = (await teamApi.getTeamProjects(this.team.id)).projects
            }
            this.loading = false
        },
        openInstance (instance) {
            this.$router.push({
                name: 'Instance',
                params: {
                    id: instance.id
                }
            })
        }
    }
}
</script>
