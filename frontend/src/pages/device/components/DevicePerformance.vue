<template>
    <div class="banner-wrapper">
        <FeatureUnavailable v-if="!isInstanceResourcesFeatureEnabledForPlatform" />
        <FeatureUnavailableToTeam v-else-if="!isInstanceResourcesFeatureEnabledForTeam" />
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
        <template v-else>
            <section class="ff-chart-section">
                <SectionTopMenu>
                    <template #hero>
                        <div class="flex items-center gap-2">
                            <ChipIcon class="ff-icon ff-icon-md text-gray-800" />
                            <div class="text-gray-800 text-xl font-medium whitespace-nowrap">CPU Utilisation</div>
                        </div>
                    </template>
                </SectionTopMenu>

                <CpuChart :resources="resources" :device="device" :loading="resources.length === 0" />
            </section>

            <section class="ff-chart-section">
                <SectionTopMenu>
                    <template #hero>
                        <div class="flex items-center gap-2">
                            <ChipIcon class="ff-icon ff-icon-md text-gray-800" />
                            <div class="text-gray-800 text-xl font-medium whitespace-nowrap">Memory Utilisation</div>
                        </div>
                    </template>
                </SectionTopMenu>
                <MemoryChart :resources="resources" :device="device" :loading="resources.length === 0" />
            </section>
        </template>
    </template>
</template>

<script>
import { ChipIcon } from '@heroicons/vue/outline'
import SemVer from 'semver'
import { mapState } from 'vuex'

import deviceApi from '../../../api/devices.js'
import EmptyState from '../../../components/EmptyState.vue'
import FfLoading from '../../../components/Loading.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'

import usePermissions from '../../../composables/Permissions.js'
import featuresMixin from '../../../mixins/Features.js'

import CpuChart from '../../instance/Performance/components/CpuChart.vue'
import MemoryChart from '../../instance/Performance/components/MemoryChart.vue'

let mqtt

export default {
    name: 'DevicePerformanceView',
    components: {
        CpuChart,
        MemoryChart,
        FfLoading,
        EmptyState,
        SectionTopMenu,
        ChipIcon,
        FeatureUnavailable,
        FeatureUnavailableToTeam
    },
    mixins: [featuresMixin],
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
            keepAliveInterval: null,
            connection: null,
            client: null
        }
    },
    computed: {
        ...mapState('account', ['team']),
        deviceOnline () {
            const offline = ['stopped', 'offline', 'error']
            return !offline.includes(this.device.status)
        },
        agentSatisfiesVersion () {
            return this.device && this.device.agentVersion && SemVer.satisfies(this.device.agentVersion, '>=3.5.1')
        },
        featureAvailable () {
            return this.isInstanceResourcesFeatureEnabledForPlatform &&
                this.isInstanceResourcesFeatureEnabledForTeam &&
                this.agentSatisfiesVersion && this.deviceOnline
        }
    },
    async mounted () {
        // need to subscribe to resources stream
        const { default: mqttImp } = await import('mqtt')
        mqtt = mqttImp
        if (this.featureAvailable) {
            this.connectMQTT()
        }
    },
    unmounted () {
        // need to unsubscribe here
        setTimeout(() => this.disconnectMQTT())
        clearInterval(this.keepAliveInterval)
    },
    methods: {
        connectMQTT: async function () {
            const creds = await deviceApi.getDeviceResourcesCreds(this.device.id)
            this.client = mqtt.connect(creds.url, {
                username: creds.username,
                password: creds.password,
                reconnectPeriod: 0
            })

            this.client.on('connect', () => {
                const topic = `ff/v1/${this.device.team.id}/d/${this.device.id}/resources`
                this.client.subscribe(topic)
                this.loading = false
                this.client.publish(`${topic}/heartbeat`, 'alive')
                this.keepAliveInterval = setInterval(() => {
                    this.client.publish(`${topic}/heartbeat`, 'alive')
                }, 10000)
            })

            this.client.on('message', (topic, message) => {
                const resourceData = JSON.parse(message.toString())
                if (Array.isArray(resourceData)) {
                    this.resources = resourceData
                } else {
                    this.resources.push(resourceData)
                }
            })

            this.keepAliveInterval = setInterval(() => {
                if (this.client && this.client.connected) {
                    this.client.publish(`ff/v1/${this.device.team.id}/d/${this.device.id}/resources/heartbeat`, 'alive')
                }
            }, 30000)
        },
        disconnectMQTT: function () {
            if (this.client) {
                this.client.end()
            }
        }
    }
}
</script>
