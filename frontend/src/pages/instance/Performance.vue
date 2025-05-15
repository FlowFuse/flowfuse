<template>
    <SectionTopMenu>
        <template #hero>
            <div class="flex items-center gap-2">
                <ChipIcon class="ff-icon ff-icon-md text-gray-800" />
                <div class="text-gray-800 text-xl font-medium whitespace-nowrap">CPU Utilisation</div>
            </div>
        </template>
    </SectionTopMenu>

    <ff-loading v-if="loading" />

    <v-chart v-else-if="!error" class="chart" :option="chartOptions" renderer="canvas" autoresize />

    <empty-state v-else>
        <template #header>
            <span v-if="!isInstanceRunning">The Hosted Instance must be running</span>
            <span v-else>Something went wrong!</span>
        </template>
        <template #message>
            <p>Could not load your instance resources.</p>
        </template>
    </empty-state>
</template>

<script>
import { ChipIcon } from '@heroicons/vue/outline'
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
import VChart, { THEME_KEY } from 'vue-echarts'
import { mapState } from 'vuex'

import instancesApi from '../../api/instances.js'
import EmptyState from '../../components/EmptyState.vue'
import FfLoading from '../../components/Loading.vue'

import SectionTopMenu from '../../components/SectionTopMenu.vue'
import usePermissions from '../../composables/Permissions.js'
export default {
    name: 'InstancePerformance',
    components: {
        EmptyState,
        FfLoading,
        SectionTopMenu,
        ChipIcon,
        VChart
    },
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
            error: null
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
                legend: {
                    data: ['CPU']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
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
                        start: this.filteredResources.length < 100 ? 0 : 80,
                        end: 100,
                        labelFormatter: (value) => {
                            const ts = this.filteredResources[value]?.ts ?? 0
                            const date = new Date(Number(ts))
                            return `{label|${date.toLocaleDateString()} ${date.toLocaleTimeString()}}`
                        },
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
                        return date.toLocaleDateString()
                    }
                }
            }
        },
        yAxis () {
            return {
                type: 'value',
                axisLabel: {
                    formatter: function (value) {
                        return `${value}%`
                    }
                }
            }
        },
        filteredResources () {
            return this.resources.filter(res => res.cpu && res.ts)
        },
        isInstanceRunning () {
            return this.instance.meta.state === 'running'
        }
    },
    watch: {
        team: {
            immediate: true,
            handler (team) {
                if (team && !this.hasPermission('project:read')) {
                    this.$router.push({
                        name: 'instance-overview',
                        params: this.$route.params
                    })
                }
            }
        }
    },
    mounted () {
        this.getResources()
            .catch(e => {
                this.error = e
            })
            .finally(() => {
                this.loading = false
            })
    },
    methods: {
        getResources () {
            if (this.isInstanceRunning) {
                return instancesApi.getResources(this.instance.id)
                    .then(response => {
                        this.resources = response.resources
                    })
                    .catch(e => {
                        this.error = e
                    })
            }

            return Promise.reject(new Error('Instance is not running.'))
        }
    }
}
</script>

<style scoped lang="scss">
.chart {
    max-height: 450px;
}
</style>
