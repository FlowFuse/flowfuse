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
            <ul class="ff-applications-list">
                <li v-for="application in Array.from(applications.values())" :key="application.id">
                    <div class="ff-application-list--app">
                        <span>{{ application.name }}</span>
                        <ff-kebab-menu>
                            <ff-list-item label="View Application" @click="openApplication(application)"/>
                        </ff-kebab-menu>
                    </div>
                    <ul class="ff-applications-list-instances">
                        <label>Instances</label>
                        <li v-for="instance in application.instances" :key="instance.id" @click.stop="openInstance(instance)">
                            <div class="ff-applications-list--instance">
                                <label>{{ instance.name }}</label>
                                <span>instanceurl.flowforge.cloud</span>
                            </div>
                            <div><InstanceStatusBadge :status="application.instancesMap.get(instance.id).meta?.state" /></div>
                            <div class="text-sm">
                                <span v-if="application.instancesMap.get(instance.id).flowLastUpdatedSince">
                                    {{ application.instancesMap.get(instance.id).flowLastUpdatedSince }}
                                </span>
                                <span v-else class="text-gray-400">
                                    never
                                </span>
                            </div>
                            <div>
                                <ff-button kind="secondary" :disabled="true"><template v-slot:icon-right><ExternalLinkIcon /></template>Open Editor</ff-button>
                            </div>
                        </li>
                    </ul>
                </li>
            </ul>
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

<style lang="scss">
@import "../../stylesheets/components/applications-list.scss";
</style>
