<template>
    <div class="banner-wrapper">
        <FeatureUnavailable v-if="!isInstanceResourcesFeatureEnabledForPlatform" />
        <FeatureUnavailableToTeam v-else-if="!isInstanceResourcesFeatureEnabledForTeam" />
        <FeatureUnavailable
            v-else-if="!launcherSatisfiesVersion"
            message="Update your instance to the latest version to enable this feature"
            :only-custom-message="true"
        />
    </div>
    <div class="flex-1 flex flex-col gap-2 overflow-auto">
        <template v-if="!featureAvailable">
            <empty-state>
                <template #header>
                    Performance Insights
                </template>
                <template #img>
                    <img src="../../../images/empty-states/instance-performance.png" alt="pipelines-logo">
                </template>
                <template #message>
                    <p>Monitor your Hosted Instance's CPU usage over time, enabling you to optimize for performance and discover potential problems before they occur.</p>
                </template>
            </empty-state>
        </template>

        <template v-else>
            <ff-loading v-if="loading" />

            <template v-else-if="!error">
                <section class="ff-chart-section">
                    <SectionTopMenu>
                        <template #hero>
                            <div class="flex items-center gap-2">
                                <ChipIcon class="ff-icon ff-icon-md text-gray-800" />
                                <div class="text-gray-800 text-xl font-medium whitespace-nowrap">CPU Utilisation</div>
                            </div>
                        </template>
                        <template #tools>
                            <div class="flex items-center gap-2">
                                <div class="ff-socket-status">
                                    <div class="ff-socket-status-icon" :class="{ 'ff-socket-status-icon-connected': wsConnected, 'ff-socket-status-icon-disconnected': !wsConnected }" />
                                    <div class="ff-socket-status-text">
                                        {{ wsConnected ? 'Connected to Live Data' : 'Unable to connect to Live Data' }}
                                    </div>
                                </div>
                                <ff-button v-if="!wsConnected" size="small" kind="secondary" @click="getResources">
                                    <template #icon><RefreshIcon /></template>
                                </ff-button>
                            </div>
                        </template>
                    </SectionTopMenu>

                    <CpuChart :resources="resources" :instance="instance" />
                </section>

                <section class="ff-chart-section">
                    <SectionTopMenu>
                        <template #hero>
                            <div class="flex items-center gap-2">
                                <ChipIcon class="ff-icon ff-icon-md text-gray-800" />
                                <div class="text-gray-800 text-xl font-medium whitespace-nowrap">Memory Utilisation</div>
                            </div>
                        </template>
                        <template #tools>
                            <div class="flex items-center gap-2">
                                <div class="ff-socket-status">
                                    <div class="ff-socket-status-icon" :class="{ 'ff-socket-status-icon-connected': wsConnected, 'ff-socket-status-icon-disconnected': !wsConnected }" />
                                    <div class="ff-socket-status-text">
                                        {{ wsConnected ? 'Connected to Live Data' : 'Unable to connect to Live Data' }}
                                    </div>
                                </div>
                                <ff-button v-if="!wsConnected" size="small" kind="secondary" @click="getResources">
                                    <template #icon><RefreshIcon /></template>
                                </ff-button>
                            </div>
                        </template>
                    </SectionTopMenu>
                    <MemoryChart :resources="resources" :instance="instance" />
                </section>
            </template>

            <empty-state v-else>
                <template #header>
                    <span v-if="!isInstanceRunning">The Hosted Instance must be running in order to view performance data.</span>
                    <span v-else-if="resources.length === 0">No CPU Data Found</span>
                    <span v-else>Something went wrong!</span>
                </template>
                <template #img>
                    <img src="../../../images/empty-states/instance-performance.png" alt="pipelines-logo">
                </template>
                <template #message>
                    <p>{{ error }}</p>
                </template>
            </empty-state>
        </template>
    </div>
</template>

<script>
import { ChipIcon, RefreshIcon } from '@heroicons/vue/outline'
import SemVer from 'semver'
import { mapState } from 'vuex'

import instancesApi from '../../../api/instances.js'
import EmptyState from '../../../components/EmptyState.vue'
import FfLoading from '../../../components/Loading.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'

import usePermissions from '../../../composables/Permissions.js'
import featuresMixin from '../../../mixins/Features.js'

import CpuChart from './components/CpuChart.vue'
import MemoryChart from './components/MemoryChart.vue'

export default {
    name: 'InstancePerformance',
    components: {
        MemoryChart,
        CpuChart,
        EmptyState,
        FfLoading,
        SectionTopMenu,
        ChipIcon,
        RefreshIcon,
        FeatureUnavailable,
        FeatureUnavailableToTeam
    },
    mixins: [featuresMixin],
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
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
            resources: [],
            loading: true,
            error: null,
            wsConnected: false,
            ws: null
        }
    },
    computed: {
        ...mapState('account', ['team']),
        isInstanceRunning () {
            return this.instance.meta.state === 'running'
        },
        launcherSatisfiesVersion () {
            if (!this.isInstanceRunning) {
                return true
            }

            // If httpAdminRoot is not set (or '/'), then we can use launcher 1.13 or later.
            // Otherwise, we need launcher 2.18 or later due to a bug fix for handling httpAdminRoot in the resource API
            let minVersion = '>=1.13'
            if (this.instance?.settings?.httpAdminRoot && this.instance.settings.httpAdminRoot !== '/') {
                minVersion = '>=2.18.0'
            }
            const nrLauncherVersion = SemVer.coerce(this.instance?.meta?.versions?.launcher)
            return SemVer.satisfies(nrLauncherVersion, minVersion)
        },
        featureAvailable () {
            return this.isInstanceResourcesFeatureEnabledForPlatform &&
                this.isInstanceResourcesFeatureEnabledForTeam &&
                this.launcherSatisfiesVersion
        }
    },
    mounted () {
        if (this.featureAvailable) {
            this.getResources()
                .then(() => {
                    this.connectToLiveData()
                })
                .catch(e => {
                    this.error = e
                })
                .finally(() => {
                    this.loading = false
                })
        } else {
            this.loading = false
        }
    },
    beforeUnmount () {
        if (this.ws) {
            this.ws.close()
        }
    },
    methods: {
        getResources () {
            if (this.isInstanceRunning) {
                return instancesApi.getResources(this.instance.id)
                    .then(response => {
                        if (response.resources.length === 0) {
                            this.error = 'Waiting for resource data'
                        } else if (response.resources.length > 0) {
                            let hasCPU = false
                            // sanity check we have "cpu" in the resources
                            for (const resource of response.resources) {
                                if (Object.prototype.hasOwnProperty.call(resource, 'cpu')) {
                                    hasCPU = true
                                    break
                                }
                            }
                            if (!hasCPU) {
                                this.error = 'CPU Utilization data is not available for this instance'
                            } else {
                                this.resources = response.resources
                            }
                        } else {
                            this.error = null
                        }
                    })
                    .catch(e => {
                        this.error = e
                    })
            }

            return Promise.reject(new Error('Instance is not running.'))
        },
        connectToLiveData () {
            if (this.wsConnected) {
                return
            }
            const uri = `/api/v1/projects/${this.instance.id}/resources/stream`
            this.ws = new WebSocket(uri)
            this.ws.addEventListener('open', () => {
                this.wsConnected = true
            })
            this.ws.addEventListener('message', async (event) => {
                const data = JSON.parse(await event.data.text())
                if (
                    Object.prototype.hasOwnProperty.call(data, 'cpu') ||
                    Object.prototype.hasOwnProperty.call(data, 'ps')
                ) {
                    this.resources.push({
                        ts: Date.now(),
                        cpu: data.cpu,
                        ps: data.ps
                    })
                }
            })
            this.ws.addEventListener('error', (event) => {
                this.wsConnected = false
            })
            this.ws.addEventListener('close', () => {
                this.wsConnected = false
            })
        }
    }
}
</script>

<style scoped lang="scss">
.chart {
    max-height: 450px;
}

.ff-socket-status {
    display: flex;
    align-items: center;
    gap: 4px;
}

.ff-socket-status-icon {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: $ff-grey-500;
}

.ff-socket-status-icon-connected {
    background-color: $ff-green-500;
}

.ff-socket-status-icon-disconnected {
    background-color: $ff-red-500;
}

.ff-chart-section {
    flex: 1;
    max-height: 50%;
}
</style>
