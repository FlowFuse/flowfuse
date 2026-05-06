<template>
    <div id="device-performance" class="flex-1 flex flex-col overflow-auto">
        <div class="banner-wrapper">
            <FeatureUnavailable v-if="!featuresCheck.isInstanceResourcesFeatureEnabledForPlatform" />
            <FeatureUnavailableToTeam v-else-if="!featuresCheck.isInstanceResourcesFeatureEnabledForTeam" />
            <FeatureUnavailable
                v-if="!agentSatisfiesVersion"
                message="Update your device agent to the latest version to enable this feature"
                :only-custom-message="true"
            />
        </div>
        <template v-if="!featureAvailable">
            <empty-state>
                <template #header>
                    Performance Insights
                </template>
                <template #img>
                    <img src="../../../images/empty-states/instance-performance.png" alt="pipelines-logo">
                </template>
                <template #message>
                    <p>Monitor your Remote Instance's CPU usage over time, enabling you to optimize for performance and discover potential problems before they occur.</p>
                </template>
            </empty-state>
        </template>
        <template v-else>
            <ff-loading v-if="loading" />
            <section v-else class="mt-4 flex flex-col gap-4 flex-1">
                <section class="ff-chart-section flex-1">
                    <information-well>
                        <SectionTopMenu>
                            <template #hero>
                                <div class="flex items-center gap-2">
                                    <ChipIcon class="ff-icon ff-icon-md text-gray-800" />
                                    <div class="text-gray-800 text-xl font-medium whitespace-nowrap">CPU Utilisation</div>
                                </div>
                            </template>
                        </SectionTopMenu>
                        <CpuChart :resources="resources" :device="device" :loading="resources.length === 0" />
                    </information-well>
                </section>

                <section class="ff-chart-section flex-1">
                    <information-well>
                        <SectionTopMenu>
                            <template #hero>
                                <div class="flex items-center gap-2">
                                    <ChipIcon class="ff-icon ff-icon-md text-gray-800" />
                                    <div class="text-gray-800 text-xl font-medium whitespace-nowrap">Memory Utilisation</div>
                                </div>
                            </template>
                        </SectionTopMenu>
                        <MemoryChart :resources="resources" :device="device" :loading="resources.length === 0" />
                    </information-well>
                </section>
            </section>
        </template>
    </div>
</template>

<script>
import { ChipIcon } from '@heroicons/vue/outline'
import { mapState } from 'pinia'
import SemVer from 'semver'

import deviceApi from '../../../api/devices.js'
import EmptyState from '../../../components/EmptyState.vue'
import FfLoading from '../../../components/Loading.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'

import CpuChart from '../../../components/charts/performance/CpuChart.vue'
import MemoryChart from '../../../components/charts/performance/MemoryChart.vue'
import InformationWell from '../../../components/wells/InformationWell.vue'
import usePermissions from '../../../composables/Permissions.js'

import getServicesOrchestrator from '@/services/service.orchestrator'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

const HEARTBEAT_INTERVAL = 10000

export default {
    name: 'DevicePerformanceView',
    components: {
        InformationWell,
        CpuChart,
        MemoryChart,
        FfLoading,
        EmptyState,
        SectionTopMenu,
        ChipIcon,
        FeatureUnavailable,
        FeatureUnavailableToTeam
    },
    inheritAttrs: false,
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    setup () {
        const { hasPermission } = usePermissions()

        return {
            hasPermission
        }
    },
    data () {
        return {
            loading: true,
            resources: [],
            keepAliveInterval: null
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useContextStore, ['team']),
        deviceOnline () {
            const offline = ['stopped', 'offline', 'error']
            return !offline.includes(this.device.status)
        },
        agentSatisfiesVersion () {
            return this.device && this.device.agentVersion && SemVer.satisfies(this.device.agentVersion, '>=3.5.1', { includePrerelease: true })
        },
        featureAvailable () {
            return this.featuresCheck.isInstanceResourcesFeatureEnabledForPlatform &&
                this.featuresCheck.isInstanceResourcesFeatureEnabledForTeam &&
                this.agentSatisfiesVersion && this.deviceOnline
        },
        mqttConnectionKey () {
            return `device-resources-${this.device.id}`
        },
        resourcesTopic () {
            return `ff/v1/${this.device.team.id}/d/${this.device.id}/resources`
        }
    },
    mounted () {
        if (this.featureAvailable) {
            this.connectMQTT()
        }
    },
    unmounted () {
        this.disconnectMQTT()
    },
    methods: {
        getMqttService () {
            return getServicesOrchestrator().$serviceInstances.mqtt
        },
        async connectMQTT () {
            const mqttService = this.getMqttService()

            await mqttService.createClient(this.mqttConnectionKey, {
                getCredentials: () => deviceApi.getDeviceResourcesCreds(this.device.id),
                onConnect: async () => {
                    await mqttService.subscribe(this.mqttConnectionKey, this.resourcesTopic)
                    this.loading = false

                    await mqttService.publishMessage(this.mqttConnectionKey, {
                        topic: `${this.resourcesTopic}/heartbeat`,
                        payload: 'alive',
                        qos: 0,
                        serialize: 'raw'
                    })

                    clearInterval(this.keepAliveInterval)
                    this.keepAliveInterval = setInterval(() => {
                        mqttService.publishMessage(this.mqttConnectionKey, {
                            topic: `${this.resourcesTopic}/heartbeat`,
                            payload: 'alive',
                            qos: 0,
                            serialize: 'raw'
                        }).catch(() => {})
                    }, HEARTBEAT_INTERVAL)
                },
                onMessage: (topic, message) => {
                    const resourceData = JSON.parse(message.toString())
                    if (Array.isArray(resourceData)) {
                        this.resources = resourceData
                    } else {
                        this.resources.push(resourceData)
                    }
                }
            })
        },
        async disconnectMQTT () {
            clearInterval(this.keepAliveInterval)
            const mqttService = this.getMqttService()
            if (mqttService.hasClient(this.mqttConnectionKey)) {
                await mqttService.destroyClient(this.mqttConnectionKey)
            }
        }
    }
}
</script>
