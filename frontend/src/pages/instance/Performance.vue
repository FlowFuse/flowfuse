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
    <template v-if="!featureAvailable">
        <empty-state>
            <template #header>
                Performance Insights
            </template>
            <template #img>
                <img src="../../images/empty-states/instance-performance.png" alt="pipelines-logo">
            </template>
            <template #message>
                <p>Monitor your Hosted Instance's CPU usage over time, enabling you to optimize for performance and discover potential problems before they occur.</p>
            </template>
        </empty-state>
    </template>
    <template v-else>
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

        <ff-loading v-if="loading" />

        <v-chart v-else-if="!error" class="chart" :option="chartOptions" renderer="canvas" autoresize @datazoom="onDataZoom" />

        <empty-state v-else>
            <template #header>
                <span v-if="!isInstanceRunning">The Hosted Instance must be running in order to view performance data.</span>
                <span v-else-if="resources.length === 0">No CPU Data Found</span>
                <span v-else>Something went wrong!</span>
            </template>
            <template #img>
                <img src="../../images/empty-states/instance-performance.png" alt="pipelines-logo">
            </template>
            <template #message>
                <p>{{ error }}</p>
            </template>
        </empty-state>
    </template>
</template>

<script>
import { ChipIcon, RefreshIcon } from '@heroicons/vue/outline'
import { LineChart } from 'echarts/charts'
import {
    DataZoomComponent,
    DataZoomInsideComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import SemVer from 'semver'
import VChart, { THEME_KEY } from 'vue-echarts'
import { mapState } from 'vuex'

import instancesApi from '../../api/instances.js'
import EmptyState from '../../components/EmptyState.vue'
import FfLoading from '../../components/Loading.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import FeatureUnavailable from '../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../components/banners/FeatureUnavailableToTeam.vue'

import usePermissions from '../../composables/Permissions.js'
import featuresMixin from '../../mixins/Features.js'

export default {
    name: 'InstancePerformance',
    components: {
        EmptyState,
        FfLoading,
        SectionTopMenu,
        ChipIcon,
        RefreshIcon,
        VChart,
        FeatureUnavailable,
        FeatureUnavailableToTeam
    },
    mixins: [featuresMixin],
    provide: {
        [THEME_KEY]: 'light'
    },
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    setup () {
        const { hasPermission } = usePermissions()
        use([
            CanvasRenderer,
            DataZoomComponent,
            DataZoomInsideComponent,
            LineChart,
            TooltipComponent,
            LegendComponent,
            GridComponent
        ])

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
            zoom: {
                start: 80,
                end: 100
            },
            ws: null
        }
    },
    computed: {
        ...mapState('account', ['team']),
        chartOptions () {
            return {
                tooltip: {
                    trigger: 'axis',
                    formatter: function (params) {
                        const timestamp = Number(params[0].axisValue)
                        const date = new Date(timestamp)
                        const formattedDate = date.toLocaleString()

                        let content = `${formattedDate}<br/>`
                        params.forEach(item => {
                            content += `${item.seriesName}: ${item.data.toFixed(2)}%<br/>`
                        })
                        return content
                    }
                },
                grid: {
                    left: '0%',
                    right: '0%',
                    containLabel: true
                },
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                series: this.series,
                dataZoom: [
                    {
                        type: 'slider', // visible scrollbar
                        show: true,
                        xAxisIndex: 0,
                        // starting window (e.g., show last 20% if number of entries is over 100)
                        start: this.filteredResources.length < 100 ? 0 : this.zoom.start,
                        end: this.zoom.end,
                        labelFormatter: (value) => {
                            const ts = this.filteredResources[value]?.ts ?? 0
                            const date = new Date(Number(ts))
                            return `{label|${date.toLocaleDateString()} ${date.toLocaleTimeString()}}`
                        },
                        moveHandleSize: 12,
                        textStyle: {
                            color: '#333',
                            fontSize: 12,
                            rich: {
                                label: {
                                    borderColor: 'grey',
                                    backgroundColor: 'white',
                                    borderWidth: 1,
                                    borderRadius: 4,
                                    padding: [4, 6]
                                }
                            }
                        }
                    },
                    {
                        type: 'inside', // scroll with mouse or touch
                        xAxisIndex: 0,
                        start: 80,
                        end: 100
                    }
                ]
            }
        },
        series () {
            return [
                this.cpuSeries
            ]
        },
        cpuSeries () {
            return {
                name: 'CPU',
                type: 'line',
                stack: 'Total',
                data: this.filteredResources.map(res => {
                    // first responses might not contain relevant info
                    const cpu = res.cpu ?? 0

                    if (this.instance.stack?.properties?.cpu) {
                        // scaling down to match stack cpu allocation
                        return (cpu / this.instance.stack.properties.cpu) * 100
                    }

                    return cpu
                })
            }
        },
        xAxis () {
            return {
                type: 'category',
                boundaryGap: false,
                data: this.filteredResources.map(res => res.ts),
                axisLabel: {
                    formatter: function (value) {
                        const date = new Date(Number(value))
                        return date.toLocaleTimeString()
                    }
                }
            }
        },
        yAxis () {
            return [{
                type: 'value',
                position: 'right',
                axisLabel: {
                    formatter: function (value) {
                        return `${value}%`
                    }
                }
            }]
        },
        filteredResources () {
            return this.resources.filter(res => res.cpu && res.ts)
        },
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
                // does the data contain a cpu key?
                if (Object.prototype.hasOwnProperty.call(data, 'cpu')) {
                    this.resources.push({
                        ts: Date.now(),
                        cpu: data.cpu
                    })
                }
            })
            this.ws.addEventListener('error', (event) => {
                this.wsConnected = false
            })
            this.ws.addEventListener('close', () => {
                this.wsConnected = false
            })
        },
        onDataZoom (event) {
            this.zoom.start = event.start
            this.zoom.end = event.end
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
</style>
