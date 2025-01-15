<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Remote Instances Groups">
                <template #context>
                    Remote Instance Groups provide a way of managing multiple Remote instances together, for example deploying to multiple Remote Instances via a Pipeline.
                </template>
                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/device_group_red.png">
                </template>
                <template #helptext>
                    <p>Remote Instance Groups permit the grouping of Application assigned Remote Instances.</p>
                    <p>The Groups can then be set as the target in a DevOps Pipeline to update multiple devices in a single operation</p>
                </template>
            </ff-page-header>
        </template>
        <EmptyState
            v-if="!featuresCheck.isDeviceGroupsFeatureEnabled"
            :feature-unavailable-to-team="!featuresCheck.isDeviceGroupsFeatureEnabled"
        >
            <template #img>
                <img src="../../../images/empty-states/application-device-groups.png" alt="logo">
            </template>
            <template #header>
                <span>Remote Instance Groups Not Available</span>
            </template>
            <template #message>
                <p>Remote Instance Groups permit the grouping of Application assigned Remote Instances.</p>
                <p>The Groups can then be set as the target in a DevOps Pipeline to update multiple devices in a single operation</p>
            </template>
        </EmptyState>

        <template v-else>
            <div id="team-device-groups" class="space-y-6">
                <ff-loading v-if="loading" message="Loading Remote Instance Groups..." />

                <template v-else>
                    <ff-text-input
                        v-model="filterTerm"
                        class="ff-data-table--search"
                        data-form="search"
                        placeholder="Search Groups..."
                    >
                        <template #icon>
                            <SearchIcon />
                        </template>
                    </ff-text-input>

                    <section v-if="deviceGroups.length > 0" class="pipelines">
                        <ul class="pipelines-list">
                            <li v-for="group in filteredDeviceGroups" :key="group.id">
                                device-group
                            </li>
                        </ul>
                        <p v-if="filteredDeviceGroups.length === 0" class="no-results">
                            No Data Found. Try Another Search.
                        </p>
                    </section>

                    <EmptyState v-else>
                        <template #img>
                            <img src="../../../images/empty-states/application-device-groups.png" alt="logo">
                        </template>
                        <template #header>Start building your Remote Instance Groups</template>
                        <template #message>
                            <p>Remote Instance Groups permit the grouping of Application assigned Remote Instances.</p>
                            <p>The Groups can then be set as the target in a DevOps Pipeline to update multiple devices in a single operation</p>
                        </template>
                        <template #actions>
                            <ff-button class="center" @click="showCreateDeviceGroupDialog">Create Group</ff-button>
                        </template>
                    </EmptyState>
                </template>
            </div>
        </template>
    </ff-page>
    <ff-dialog ref="create-dialog" class="ff-dialog-box--info" header="Create Application Device Group">
        <template #default>
            <slot name="helptext">
                <p>Enter the name and description of the Device Group to create.</p>
            </slot>
            <div class="flex gap-4">
                <div class="flex-grow">
                    <div class="form-row max-w-sm mb-2">
                        <label>
                            <span class="block mb-1">
                                Application
                            </span>
                            <ff-listbox
                                v-model="input.application"
                                :options="applicationOptions"
                                data-el="snapshots-list"
                                label-key="label"
                                option-title-key="description"
                                class="flex-grow w-full"
                            />
                        </label>
                    </div>
                    <FormRow v-model="input.name" class="mb-2" :error="!input.name ? 'required' : ''" data-form="name">Name</FormRow>
                    <FormRow v-model="input.description" data-form="name">Description</FormRow>
                </div>
            </div>
        </template>
        <template #actions>
            <ff-button kind="secondary" @click="$refs['create-dialog'].close()">Cancel</ff-button>
            <ff-button kind="primary" @click="createDeviceGroup">Create</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { SearchIcon } from '@heroicons/vue/outline'
import { mapGetters } from 'vuex'

import ApplicationAPI from '../../../api/application.js'

import teamApi from '../../../api/team.js'

import EmptyState from '../../../components/EmptyState.vue'
import FormRow from '../../../components/FormRow.vue'
import usePermissions from '../../../composables/Permissions.js'
import Alerts from '../../../services/alerts.js'
import FfButton from '../../../ui-components/components/Button.vue'
import FfListbox from '../../../ui-components/components/form/ListBox.vue'

export default {
    name: 'DeviceGroups',
    components: {
        FfListbox,
        FormRow,
        FfButton,
        EmptyState,
        SearchIcon
    },
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    data () {
        return {
            loading: false,
            filterTerm: '',
            deviceGroups: [],
            input: {
                name: '',
                description: '',
                application: ''
            },
            applications: []
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'team']),
        filteredDeviceGroups () {
            return this.deviceGroups
        },
        applicationOptions () {
            return this.applications.map(app => ({ label: app.name, value: app.id }))
        }
    },
    mounted () {
        if (this.hasPermission('team:device-group:list')) {
            this.loadTeamDeviceGroups()
        }
    },
    methods: {
        async showCreateDeviceGroupDialog () {
            this.getApplications()
                .then(() => this.$refs['create-dialog'].show())
                .catch(e => e)
        },
        getApplications () {
            return teamApi.getTeamApplications(this.team.id, { includeApplicationSummary: false })
                .then((res) => {
                    this.applications = res.applications
                })
                .catch(e => e)
        },
        async loadTeamDeviceGroups () {
            return teamApi.getTeamDeviceGroups(this.team.id)
                .then(res => {
                    this.deviceGroups = res.groups
                })
                .catch(e => e)
        },
        async createDeviceGroup () {
            if (!this.input.name) {
                Alerts.emit('Device Group name is required', 'warning')
                return
            }
            if (!this.input.application) {
                Alerts.emit('An application is required', 'warning')
                return
            }

            ApplicationAPI.createDeviceGroup(this.input.application, this.input.name, this.input.description)
                .then((result) => {
                    this.$refs['create-dialog'].close()
                    this.loadTeamDeviceGroups()
                })
                .catch((err) => {
                    console.error(err)
                    Alerts.emit('Failed to create Device Group. Check the console for more details', 'error', 7500)
                })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
