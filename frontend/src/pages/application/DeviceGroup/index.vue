<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions />
    </Teleport>

    <main v-if="!application?.id">
        <ff-loading message="Loading Application..." />
    </main>
    <main v-else class="ff-with-status-header">
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">
                You are viewing this device group as an Administrator
            </div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <div class="ff-instance-header">
            <ff-page-header :title="deviceGroup?.name" :tabs="navigation">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb class="whitespace-nowrap" :to="{name: 'ApplicationDeviceGroups', params: {id: application?.id}}">Device Groups</ff-nav-breadcrumb>
                </template>
                <template #tools>
                    <InfoCard header="">
                        <template #content>
                            <InfoCardRow property="Target Snapshot:">
                                hello
                                <template #value>
                                    <span class="flex gap-2 pr-2" data-el="device-group-target-snapshot">
                                        <span class="flex items-center space-x-2 pt-1 text-gray-500 italic">
                                            <ExclamationIcon v-if="!targetSnapshot" class="text-yellow-600 w-4" />
                                            <CheckCircleIcon v-else class="text-green-700 w-4" />
                                        </span>
                                        <div class="flex flex-col">
                                            <span v-if="targetSnapshot" data-el="snapshot-name">{{ targetSnapshot.name }}</span>
                                            <span v-else data-el="snapshot-name">No Target Snapshot Set</span>
                                            <span v-if="targetSnapshot" class="text-xs text-gray-500" data-el="snapshot-id">{{ targetSnapshot.id }}</span>
                                        </div>
                                    </span>
                                </template>
                            </InfoCardRow>
                        </template>
                    </InfoCard>
                </template>
                <template #context>
                    <div>
                        Application:
                        <router-link :to="{name: 'Application', params: {id: application?.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ application?.name }}</router-link>
                    </div>
                </template>
            </ff-page-header>
        </div>
        <div class="px-3 py-3 md:px-6 md:py-6">
            <router-view
                :application="application"
                :deviceGroup="deviceGroup"
                :applicationDevices="devicesArray"
                :is-visiting-admin="isVisitingAdmin"
                :team="team"
                :team-membership="teamMembership"
                @device-group-updated="load"
                @device-group-members-updated="load"
            />
        </div>
    </main>
</template>

<script>
import { CheckCircleIcon, CogIcon, ExclamationIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import { Roles } from '../../../../../forge/lib/roles.js'

import ApplicationApi from '../../../api/application.js'

import InfoCard from '../../../components/InfoCard.vue'
import InfoCardRow from '../../../components/InfoCardRow.vue'
import SideNavigationTeamOptions from '../../../components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '../../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../../components/banners/TeamTrial.vue'
import DeviceSolidIcon from '../../../components/icons/DeviceSolid.js'

import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'DeviceGroup',
    components: {
        CheckCircleIcon,
        ExclamationIcon,
        InfoCard,
        InfoCardRow,
        SideNavigationTeamOptions,
        SubscriptionExpiredBanner,
        TeamTrialBanner
    },
    mixins: [permissionsMixin],
    data: function () {
        return {
            mounted: false,
            application: {},
            deviceGroup: {},
            applicationDevices: []
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        isVisitingAdmin () {
            return this.teamMembership?.role === Roles.Admin
        },
        navigation () {
            const routes = [
                {
                    label: 'Devices',
                    to: {
                        name: 'ApplicationDeviceGroupDevices',
                        params: {
                            applicationId: this.application?.id,
                            deviceGroupId: this.deviceGroup?.id
                        }
                    },
                    tag: 'application-device-group-devices',
                    icon: DeviceSolidIcon
                },
                {
                    label: 'Settings',
                    to: {
                        name: 'ApplicationDeviceGroupSettings',
                        params: {
                            applicationId: this.application?.id,
                            deviceGroupId: this.deviceGroup?.id
                        }
                    },
                    tag: 'application-device-group-settings',
                    icon: CogIcon
                }
            ]
            return routes
        },
        instancesArray () {
            return Array.from(this.applicationInstances.values())
        },
        devicesArray () {
            return this.applicationDevices
        },
        targetSnapshot () {
            return this.deviceGroup?.targetSnapshot || null
        }
    },
    async created () {
        await this.load()

        this.$watch(
            () => this.$route.params.id,
            async () => {
                await this.load()
            }
        )
    },
    mounted () {
        this.mounted = true
    },
    methods: {
        async load () {
            const applicationId = this.$route.params.applicationId

            // See https://github.com/FlowFuse/flowfuse/issues/2929
            if (!applicationId) {
                return
            }

            try {
                this.applicationInstances = []
                this.deviceGroup = await ApplicationApi.getDeviceGroup(applicationId, this.$route.params.deviceGroupId)
                this.application = await ApplicationApi.getApplication(applicationId)
                const deviceData = await ApplicationApi.getApplicationDevices(applicationId)
                this.applicationDevices = deviceData?.devices

                this.$store.dispatch('account/setTeam', this.application.team.slug)
            } catch (err) {
                this.$router.push({
                    name: 'PageNotFound',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
            }
        }
    }
}
</script>
