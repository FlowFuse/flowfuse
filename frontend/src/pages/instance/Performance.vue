<template>
    <SectionTopMenu>
        <template #hero>
            <div class="flex items-center gap-2">
                <ChipIcon class="ff-icon ff-icon-md text-gray-800" />
                <div class="text-gray-800 text-xl font-medium whitespace-nowrap">CPU Utilisation</div>
            </div>
        </template>
    </SectionTopMenu>
    <v-chart class="chart" :option="chartOptions" renderer="canvas" autoresize />
</template>

<script>
import { ChipIcon } from '@heroicons/vue/outline'
import { LineChart } from 'echarts/charts'
import {
    GridComponent,
    LegendComponent,
    TooltipComponent
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart, { THEME_KEY } from 'vue-echarts'

import instancesApi from '../../api/instances.js'

import SectionTopMenu from '../../components/SectionTopMenu.vue'
export default {
    name: 'InstancePerformance',
    components: {
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
        use([
            CanvasRenderer,
            LineChart,
            TooltipComponent,
            LegendComponent,
            GridComponent
        ])
    },
    data () {
        return {
            resources: []
        }
    },
    computed: {
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
                            content += `${item.seriesName}: ${item.data.toFixed()}%<br/>`
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
                series: this.series
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
                data: this.resources.map(res => {
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
                data: this.resources.map(res => res.ts),
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
                type: 'value'
            }
        }
    },
    mounted () {
        instancesApi.getResources(this.instance.id)
            .then(response => {
                this.resources = response.resources
            })
            .catch(e => e)
    }
}
</script>

<style scoped lang="scss">
.chart {
    max-height: 450px;
}
</style>
