<template>
    <SectionTopMenu hero="Instances" />
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Instances..." />
        <template v-else>
            <ff-data-table
                data-el="instances-table" :columns="columns" :rows="instances" :show-search="true" search-placeholder="Search Instances..."
                :rows-selectable="true" @row-selected="openInstance"
            >
                <template v-if="instances.length == 0" #table>
                    <div class="ff-no-data ff-no-data-large">
                        You don't have any instances yet
                    </div>
                </template>
            </ff-data-table>
        </template>
    </div>
</template>

<script>
import { markRaw } from 'vue'

import SectionTopMenu from '../../components/SectionTopMenu'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge'

import teamApi from '../../api/team'
import permissionsMixin from '../../mixins/Permissions'

export default {
    name: 'TeamInstances',
    components: {
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
                { label: 'Updated', class: ['w-60'], key: 'updatedSince', sortable: true },
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
