<template>
    <SectionTopMenu
        hero="Application Device Groups"
        help-header="FlowFuse - Application Device Groups"
        info="Manage your Application's Device Groups."
    >
        <template #pictogram>
            <img src="../../images/pictograms/device_group_red.png">
        </template>
        <template #helptext>
            <p>Application Device Groups permit the grouping of Application assigned Devices.</p>
            <p>The device groups can then be set as the target in a DevOps Pipeline to update multiple devices in a single operation</p>
        </template>
    </SectionTopMenu>
    <ff-loading
        v-if="loading"
        message="Loading Device Groups..."
    />
    <div v-else-if="deviceGroups?.length > 0" class="pt-4 space-y-6" data-el="device-group-list">
        <ff-data-table v-model:search="tableSearch" :columns="tableColumns" :rows="deviceGroups" :show-search="true" search-placeholder="Filter..." data-el="device-groups-table" :rows-selectable="true" @row-selected="editDeviceGroup">
            <template #actions>
                <ff-button data-action="create-device-group" :disabled="!featureEnabled" @click="showCreateDeviceGroupDialog">
                    <template #icon-left><PlusSmIcon /></template>
                    Add Device Group
                </ff-button>
            </template>
        </ff-data-table>
    </div>
    <EmptyState v-else :featureUnavailable="!featureEnabledForPlatform" :featureUnavailableToTeam="!featureEnabledForTeam" :featureUnavailableMessage="'Device Groups are an enterprise feature'">
        <template #header>Add your Application's First Device Group</template>
        <template #img>
            <img src="../../images/empty-states/application-device-groups.png">
        </template>
        <template #message>
            <p>Application Device Groups permit the grouping of Application assigned Devices.</p>
            <p>The device groups can then be set as the target in a DevOps Pipeline to update multiple devices in a single operation</p>
        </template>
        <template #actions>
            <ff-button data-action="create-device-group" :disabled="!featureEnabled" @click="showCreateDeviceGroupDialog">
                <template #icon-left><PlusSmIcon /></template>
                Add Device Group
            </ff-button>
        </template>
    </EmptyState>

    <ff-dialog ref="create-dialog" class="ff-dialog-box--info" header="Create Application Device Group">
        <template #default>
            <slot name="helptext">
                <p>Enter the name and description of the Device Group to create.</p>
            </slot>
            <div class="flex gap-4 mt-4">
                <div class="flex-grow">
                    <FormRow v-model="input.name" :error="!input.name ? 'required' : ''" data-form="name">Name</FormRow>
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
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import ApplicationAPI from '../../api/application.js'

import EmptyState from '../../components/EmptyState.vue'
import FormRow from '../../components/FormRow.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import Alerts from '../../services/alerts.js'

import TargetSnapshotCell from './components/cells/TargetSnapshot.vue'

export default {
    name: 'ApplicationDeviceGroups',
    components: {
        EmptyState,
        FormRow,
        PlusSmIcon,
        SectionTopMenu
    },
    beforeRouteLeave () {
        clearInterval(this.polling)
    },
    inheritAttrs: false,
    props: {
        instances: {
            type: Array,
            required: true
        },
        application: {
            type: Object,
            required: true
        },
        team: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            loading: false,
            deviceGroups: [],
            input: {
                name: '',
                description: ''
            },
            tableColumns: [
                {
                    label: 'Name',
                    key: 'name',
                    sortable: true,
                    class: 'w-1/4 whitespace-nowrap'
                },
                {
                    label: 'Description',
                    key: 'description',
                    sortable: true,
                    class: 'w-1/3'
                },
                {
                    label: 'Target Snapshot',
                    key: 'description',
                    sortable: true,
                    class: 'w-full',
                    component: { is: markRaw(TargetSnapshotCell) }
                },
                {
                    label: 'Device count',
                    key: 'deviceCount',
                    sortable: true,
                    class: 'w-1/4 whitespace-nowrap'
                }
            ],
            tableSearch: ''
        }
    },
    computed: {
        ...mapState('account', ['features']),
        featureEnabledForTeam () {
            return !!this.team?.type?.properties?.features?.deviceGroups
        },
        featureEnabledForPlatform () {
            return this.features?.deviceGroups
        },
        featureEnabled () {
            return this.featureEnabledForTeam && this.featureEnabledForPlatform
        }
    },
    watch: {
        featureEnabled: function (v) {
            this.loadDeviceGroups()
        }
    },
    mounted () {
        if (this.featureEnabled) {
            this.loadDeviceGroups()
        }
    },
    methods: {
        async showCreateDeviceGroupDialog () {
            this.$refs['create-dialog'].show()
        },
        async createDeviceGroup () {
            if (!this.input.name) {
                Alerts.emit('Device Group name is required')
                return
            }
            ApplicationAPI.createDeviceGroup(this.application.id, this.input.name, this.input.description)
                .then((result) => {
                    this.$refs['create-dialog'].close()
                    this.loadDeviceGroups()
                })
                .catch((err) => {
                    console.error(err)
                    Alerts.emit('Failed to create Device Group. Check the console for more details', 'error', 7500)
                })
        },
        async editDeviceGroup (deviceGroup, index) {
            // navigate to the device group details page for the selected device group @ ./DeviceGroups/edit.vue
            const route = {
                name: 'ApplicationDeviceGroupIndex',
                params: {
                    // url params
                    applicationId: this.application.id,
                    deviceGroupId: deviceGroup.id
                }
            }
            this.$router.push(route)
        },
        async loadDeviceGroups () {
            this.loading = true
            ApplicationAPI.getDeviceGroups(this.application.id)
                .then((groups) => {
                    this.deviceGroups = groups.groups
                    if (this.deviceGroups?.length > 0) {
                        // if there is no target snapshot set, set it to an empty object so that the `markRaw` function renders _something_ in the table cell
                        this.deviceGroups.forEach((group) => {
                            group.targetSnapshot = group.targetSnapshot || {}
                        })
                    }
                })
                .catch((err) => {
                    console.error(err)
                }).finally(() => {
                    this.loading = false
                })
        }
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/components/pipelines.scss";
</style>
