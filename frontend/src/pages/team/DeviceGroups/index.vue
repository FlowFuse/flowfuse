<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.groups')">
                <template #context>
                    {{ $t('ui.groupsProvideAWayOfManagingMultipleRemoteInstanc') }}
                </template>
                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/device_group_red.png">
                </template>
                <template #helptext>
                    <p>{{ $t('ui.groupsPermitTheGroupingOfApplicationAssignedRemo') }}</p>
                    <p>{{ $t('ui.groupsCanThenBeSetAsTheTargetInADevopsPipelineTo2') }}</p>
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
                <span>{{ $t('ui.groupsNotAvailable') }}</span>
            </template>
            <template #message>
                <p>{{ $t('ui.groupsPermitTheGroupingOfApplicationAssignedRemo') }}</p>
                <p>{{ $t('ui.groupsCanThenBeSetAsTheTargetInADevopsPipelineTo') }}</p>
            </template>
        </EmptyState>

        <template v-else>
            <div id="team-device-groups" class="space-y-6 overflow-auto flex flex-col flex-1" data-page="team-device-groups">
                <ff-loading v-if="loading" :message="$t('ui.loadingGroups')" />

                <template v-else>
                    <section v-if="deviceGroups.length > 0" class="pipelines overflow-auto flex flex-col flex-1">
                        <ff-data-table
                            v-model:search="tableSearch"
                            :columns="tableColumns"
                            :rows="deviceGroups"
                            :show-search="true"
                            :search-placeholder="$t('ui.filter')"
                            data-el="device-groups-table"
                            :rows-selectable="true"
                            @row-selected="goToGroup"
                        >
                            <template #actions>
                                <ff-button data-action="create-device-group" @click="showCreateDeviceGroupDialog">
                                    <template #icon-left><PlusSmallIcon /></template>
                                    {{ $t('ui.addDeviceGroup') }}
                                </ff-button>
                            </template>
                        </ff-data-table>
                    </section>

                    <EmptyState v-else>
                        <template #img>
                            <img src="../../../images/empty-states/application-device-groups.png" alt="logo">
                        </template>
                        <template #header>{{ $t('ui.startBuildingYourGroups') }}</template>
                        <template #message>
                            <p>{{ $t('ui.groupsPermitTheGroupingOfApplicationAssignedRemo') }}</p>
                            <p>{{ $t('ui.groupsCanThenBeSetAsTheTargetInADevopsPipelineTo') }}</p>
                        </template>
                        <template #actions>
                            <ff-button class="center" data-action="create-device-group" @click="showCreateDeviceGroupDialog">
                                {{ $t('ui.createGroup') }}
                            </ff-button>
                        </template>
                    </EmptyState>
                </template>
            </div>
        </template>
    </ff-page>
    <ff-dialog ref="create-dialog" class="ff-dialog-box--info" :header="$t('ui.createGroup')" data-dialog="create-group">
        <template #default>
            <slot name="helptext">
                <p>{{ $t('ui.enterTheNameAndDescriptionOfTheDeviceGroupToCrea') }}</p>
            </slot>
            <div class="flex gap-4">
                <div class="grow">
                    <div class="form-row max-w-sm mb-2">
                        <label class="block text-sm font-medium mb-1">{{ $t('ui.application') }}</label>
                        <ff-listbox
                            v-model="input.application"
                            :options="applicationOptions"
                            data-el="applications-list"
                            class="grow w-full"
                        />
                    </div>
                    <FormRow v-model="input.name" class="mb-2" :error="!input.name ? 'required' : ''" data-form="name">{{ $t('ui.name') }}</FormRow>
                    <FormRow v-model="input.description" data-form="description">{{ $t('ui.description') }}</FormRow>
                </div>
            </div>
        </template>
        <template #actions>
            <ff-button
                kind="secondary"
                data-action="dialog-cancel"
                @click="$refs['create-dialog'].close()"
            >
                {{ $t('ui.cancel') }}
            </ff-button>
            <ff-button
                kind="primary"
                data-action="dialog-confirm"
                @click="createDeviceGroup"
            >
                {{ $t('ui.create') }}
            </ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { PlusSmallIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'
import { markRaw } from 'vue'

import ApplicationAPI from '../../../api/application.js'

import teamApi from '../../../api/team.js'

import EmptyState from '../../../components/EmptyState.vue'
import FormRow from '../../../components/FormRow.vue'
import usePermissions from '../../../composables/Permissions.js'
import { t } from '../../../i18n.js'
import Alerts from '../../../services/alerts.js'
import FfButton from '../../../ui-components/components/Button.vue'
import FfListbox from '../../../ui-components/components/form/ListBox.vue'
import TargetSnapshotCell from '../../application/components/cells/TargetSnapshot.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'DeviceGroups',
    components: {
        PlusSmallIcon,
        FfListbox,
        FormRow,
        FfButton,
        EmptyState
    },
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    data () {
        return {
            loading: false,
            tableSearch: '',
            deviceGroups: [],
            applications: [],
            input: {
                name: '',
                description: '',
                application: ''
            },
            tableColumns: [
                {
                    label: t('ui.name'),
                    key: 'name',
                    sortable: true,
                    class: 'w-1/4 whitespace-nowrap'
                },
                {
                    label: t('ui.application'),
                    key: 'application.name',
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
            ]
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        applicationOptions () {
            return this.applications
                .filter(application => this.hasPermission('device:create', { application }))
                .map(app => ({ label: app.name, value: app.id }))
        }
    },
    mounted () {
        if (this.hasPermission('team:device-group:list')) {
            this.loadTeamDeviceGroups()
        } else {
            this.$router.replace({ name: 'home' })
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
        },
        goToGroup (row) {
            return this.$router.push({
                name: 'application-device-group',
                params: {
                    deviceGroupId: row.id,
                    applicationId: row.application.id
                }
            })
        }
    }
}
</script>
