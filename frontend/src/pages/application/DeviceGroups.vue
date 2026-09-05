<template>
    <SectionTopMenu
        :hero="$t('ui.applicationDeviceGroups')"
        :help-header="$t('ui.flowfuseApplicationDeviceGroups')"
        :info="$t('ui.deviceGroupsProvideAWayOfManagingMultipleRemoteI')"
    >
        <template #pictogram>
            <img src="../../images/pictograms/device_group_red.png">
        </template>
        <template #helptext>
            <p>{{ $t('ui.applicationDeviceGroupsPermitTheGroupingOfApplic') }}</p>
            <p>{{ $t('ui.theGroupsCanThenBeSetAsTheTargetInADevopsPipelin') }}</p>
        </template>
    </SectionTopMenu>
    <ff-loading
        v-if="loading"
        :message="$t('ui.loadingDeviceGroups')"
    />
    <div v-else-if="deviceGroups?.length > 0" class="pt-4 space-y-6" data-el="device-group-list">
        <ff-data-table v-model:search="tableSearch" :columns="tableColumns" :rows="deviceGroups" :show-search="true" :search-placeholder="$t('ui.filter')" data-el="device-groups-table" :rows-selectable="true" @row-selected="editDeviceGroup">
            <template #actions>
                <ff-button
                    data-action="create-device-group"
                    :disabled="!featureEnabled || !hasPermission('application:device-group:create', {application: application})"
                    @click="showCreateDeviceGroupDialog"
                >
                    <template #icon-left><PlusSmallIcon /></template>
                    {{ $t('ui.addDeviceGroup') }}
                </ff-button>
            </template>
        </ff-data-table>
    </div>
    <EmptyState v-else :featureUnavailable="!featureEnabledForPlatform" :featureUnavailableToTeam="!featureEnabledForTeam" :featureUnavailableMessage="'Device Groups are an enterprise feature'">
        <template #header>{{ $t('ui.addYourApplicationSFirstDeviceGroup') }}</template>
        <template #img>
            <img src="../../images/empty-states/application-device-groups.png">
        </template>
        <template #message>
            <p>{{ $t('ui.applicationDeviceGroupsPermitTheGroupingOfRemote') }}</p>
            <p>{{ $t('ui.theDeviceGroupsCanThenBeSetAsTheTargetInAPipelin') }}</p>
        </template>
        <template #actions>
            <ff-button
                v-if="hasPermission('application:device-group:create', {application: application})"
                data-action="create-device-group" :disabled="!featureEnabled"
                @click="showCreateDeviceGroupDialog"
            >
                <template #icon-left><PlusSmallIcon /></template>
                {{ $t('ui.addDeviceGroup') }}
            </ff-button>
        </template>
    </EmptyState>

    <ff-dialog ref="create-dialog" class="ff-dialog-box--info" :header="$t('ui.createApplicationDeviceGroup')">
        <template #default>
            <slot name="helptext">
                <p>{{ $t('ui.enterTheNameAndDescriptionOfTheDeviceGroupToCrea') }}</p>
            </slot>
            <div class="flex gap-4 mt-4">
                <div class="grow">
                    <FormRow v-model="input.name" :error="!input.name ? 'required' : ''" data-form="name">{{ $t('ui.name') }}</FormRow>
                    <FormRow v-model="input.description" data-form="name">{{ $t('ui.description') }}</FormRow>
                </div>
            </div>
        </template>
        <template #actions>
            <ff-button kind="secondary" @click="$refs['create-dialog'].close()">{{ $t('ui.cancel') }}</ff-button>
            <ff-button kind="primary" @click="createDeviceGroup">{{ $t('ui.create') }}</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { PlusSmallIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'
import { markRaw } from 'vue'

import ApplicationAPI from '../../api/application.js'

import EmptyState from '../../components/EmptyState.vue'
import FormRow from '../../components/FormRow.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import usePermissions from '../../composables/Permissions.js'

import { t } from '../../i18n.js'
import Alerts from '../../services/alerts.js'

import TargetSnapshotCell from './components/cells/TargetSnapshot.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'application-device-groups',
    components: {
        EmptyState,
        FormRow,
        PlusSmallIcon,
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
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
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
                    label: t('ui.name'),
                    key: 'name',
                    sortable: true,
                    class: 'w-1/4 whitespace-nowrap'
                },
                {
                    label: t('ui.description'),
                    key: 'description',
                    sortable: true,
                    class: 'w-1/3'
                },
                {
                    label: t('ui.targetSnapshot2'),
                    key: 'description',
                    sortable: true,
                    class: 'w-full',
                    component: { is: markRaw(TargetSnapshotCell) }
                },
                {
                    label: t('ui.deviceCount'),
                    key: 'deviceCount',
                    sortable: true,
                    class: 'w-1/4 whitespace-nowrap'
                }
            ],
            tableSearch: ''
        }
    },
    computed: {
        ...mapState(useContextStore, ['team', 'teamMembership']),
        ...mapState(useAccountSettingsStore, ['features']),
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
        },
        teamMembership: {
            handler: function () {
                if (!this.hasPermission('application:device-group:list', { application: this.application })) {
                    return this.$router.push({ name: 'application', params: this.$route.params })
                }
            },
            immediate: true
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
                name: 'application-device-group',
                params: {
                    // url params
                    applicationId: this.application.id,
                    deviceGroupId: deviceGroup.id
                }
            }
            this.$router.push(route)
        },
        async loadDeviceGroups () {
            if (this.hasPermission('application:device-group:list', { application: this.application })) {
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
}
</script>

<style lang="scss">
@use "../../stylesheets/components/pipelines.scss" as *;
</style>
