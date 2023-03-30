<template>
    <SectionTopMenu hero="Applications">
        <template #tools>
            <ff-button
                v-if="hasPermission('project:create')"
                data-action="create-application"
                kind="primary"
                :to="{name: 'CreateTeamApplication'}"
            >
                <template #icon-left>
                    <PlusSmIcon />
                </template>
                Create Application
            </ff-button>
        </template>
    </SectionTopMenu>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Applications..." />
        <template v-else>
            <ff-data-table
                data-el="projects-table" :columns="columns" :show-search="false"
                :rows-selectable="true" @row-selected="openApplication"
            >
                <template v-slot:header>
                    <ff-data-table-row>
                        <ff-data-table-cell>Name</ff-data-table-cell>
                        <ff-data-table-cell>Node-RED Status</ff-data-table-cell>
                        <ff-data-table-cell>Flows Last Deployed</ff-data-table-cell>
                        <ff-data-table-cell></ff-data-table-cell>
                    </ff-data-table-row>
                </template>
                <template v-slot:rows>
                    <template v-for="application in Array.from(applications.values())" :key="application.id">
                        <ff-data-table-row :selectable="true">
                            <ff-data-table-cell class="text-base" @click="openApplication(application)" :colspan="4">{{  application.name  }}</ff-data-table-cell>
                        </ff-data-table-row>
                        <ff-data-table-row v-for="instance in application.instances" :key="instance.id"
                                           class="ff-data-table--row--nested" :selectable="true" @selected="">
                            <template #default>
                                <ff-data-table-cell>{{ instance.name }}</ff-data-table-cell>
                                <ff-data-table-cell><InstanceStatusBadge :status="application.instancesMap.get(instance.id).meta?.state" /></ff-data-table-cell>
                                <ff-data-table-cell>
                                    <span v-if="application.instancesMap.get(instance.id).flowLastUpdatedSince">
                                        {{ application.instancesMap.get(instance.id).flowLastUpdatedSince }}
                                    </span>
                                    <span v-else class="text-gray-400">
                                        never
                                    </span>
                                </ff-data-table-cell>
                                <ff-data-table-cell>
                                    <ff-button kind="secondary" :disabled="true"><template v-slot:icon-right><ExternalLinkIcon /></template>Open Editor</ff-button>
                                </ff-data-table-cell>
                            </template>
                            <!-- <template v-slot:context-menu="{instance}">
                                <ff-list-item label="Option 1" @click.stop="doSomething(instance)"/>
                                <ff-list-item label="Option 2" @click.stop="doSomething(instance)"/>
                                <ff-list-item label="Option 3" @click.stop="doSomething(instance)"/>
                            </template> -->
                        </ff-data-table-row>
                    </template>
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
import { PlusSmIcon, ExternalLinkIcon } from '@heroicons/vue/outline'
import permissionsMixin from '@/mixins/Permissions'

import teamApi from '@/api/team'
import applicationApi from '@/api/application'
import SectionTopMenu from '@/components/SectionTopMenu'

import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'TeamApplications',
    components: {
        ExternalLinkIcon,
        PlusSmIcon,
        SectionTopMenu,
        InstanceStatusBadge
    },
    mixins: [permissionsMixin],
    props: ['team', 'teamMembership'],
    data () {
        return {
            loading: false,
            applications: new Map(),
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true }
                // { label: 'Status', class: ['w-44'], key: 'status', sortable: true, component: { is: markRaw(InstanceStatusBadge) } },
                // { label: 'Updated', class: ['w-44', 'text-xs'], key: 'updatedSince', sortable: true }
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
                data.applications?.forEach((application) => {
                    application.instancesMap = new Map()
                    this.applications.set(application.id, application)
                    this.loadInstancesStatuses(application)
                })
            }
            this.loading = false
        },
        loadInstancesStatuses (application) {
            applicationApi.getApplicationInstancesStatuses(application.id)
                .then((instances) => {
                    console.log(instances)
                    instances?.forEach((instance) => {
                        this.applications.get(application.id).instancesMap.set(instance.id, instance)
                    })
                })
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
