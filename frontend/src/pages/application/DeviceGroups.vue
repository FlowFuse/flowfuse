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
            <p>
                Application Device Groups permit the grouping of Application assigned Devices.
            </p>
        </template>
    </SectionTopMenu>

    <div v-if="deviceGroups?.length > 0" class="pt-4 space-y-6" data-el="pipelines-list">
        <ff-data-table v-model:search="tableSearch" :columns="tableColumns" :rows="deviceGroups" :show-search="true" search-placeholder="Filter..." :rows-selectable="true" @row-selected="editDeviceGroup">
            <template #actions>
                <ff-button data-action="create-device-group" :disabled="!featureEnabled" @click="showCreateDeviceGroupDialog">
                    <template #icon-left><PlusSmIcon /></template>
                    Add Device Group
                </ff-button>
            </template>
        </ff-data-table>
    </div>
    <EmptyState v-else :featureUnavailable="!featureEnabled" :featureUnavailableMessage="'Device Groups are an enterprise feature'">
        <template #header>Add your Application's First Device Group</template>
        <template #img>
            <img src="../../images/empty-states/application-device-groups.png">
        </template>
        <template #message>
            <p>
                Application Device Groups permit the grouping of Application assigned Devices.
            </p>
            <p>
                <!--{# TODO: Update this message when groups are useful to pipelines. #}-->
            </p>
        </template>
        <template #actions>
            <ff-button data-action="create-device-group" :disabled="!featureEnabled" @click="showCreateDeviceGroupDialog">
                <template #icon-left><PlusSmIcon /></template>
                Add Device Group
            </ff-button>
        </template>
    </EmptyState>

    <ff-dialog ref="create-dialog" class="ff-dialog-box--info" :header="title || 'Create Application Device Group'">
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
import { mapState } from 'vuex'

import ApplicationAPI from '../../api/application.js'

import EmptyState from '../../components/EmptyState.vue'
import FormRow from '../../components/FormRow.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import Alerts from '../../services/alerts.js'

export default {
    name: 'ApplicationDeviceGroups',
    components: {
        EmptyState,
        FormRow,
        // eslint-disable-next-line vue/no-unused-components
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
        }
    },
    data () {
        return {
            deviceGroups: [],
            deviceStatusMap: new Map(),
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
                    class: 'w-full'
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
        featureEnabled () {
            return this.features['device-groups']
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
            ApplicationAPI.getDeviceGroups(this.application.id)
                .then((groups) => {
                    this.deviceGroups = groups.groups
                })
                .catch((err) => {
                    console.error(err)
                })
        },

        async loadDeviceStatus () {
            ApplicationAPI.getApplicationDevices(this.application.id, null, null, null, { statusOnly: true })
                .then((result) => {
                    const devices = result?.devices || []

                    this.deviceStatusMap = new Map(
                        devices.map((device) => {
                            const previousStatus = this.deviceStatusMap.get(device.id)
                            return [device.id, { ...previousStatus, ...device }]
                        })
                    )
                })
                .catch((err) => {
                    console.error(err)
                })
        }
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/components/pipelines.scss";
</style>
