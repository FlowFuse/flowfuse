<template>
    <div class="chart-wrapper">
        <v-chart class="chart" :option="chartOptions" renderer="canvas" autoresize @datazoom="onDataZoom" />
    </div>
</template>

<script>
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

import { debounce } from '../../../../utils/eventHandling.js'

export default {
    name: 'MemoryChart',
    components: {
        VChart
    },
    provide: {
        [THEME_KEY]: 'light'
    },
    props: {
        resources: {
            type: Object,
            required: true
        },
        instance: {
            type: Object,
            default: null,
            required: false
        },
        device: {
            type: Object,
            default: null,
            required: false
        }
    },
    setup () {
        use([
            CanvasRenderer,
            DataZoomComponent,
            DataZoomInsideComponent,
            LineChart,
            TooltipComponent,
            LegendComponent,
            GridComponent
        ])
    },
    data () {
        return {
            zoom: {
                start: 80,
                end: 100
            }
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
                        const unit = this.instance ? '%' : 'mb'
                        params.forEach(item => {
                            content += `${item.seriesName}: ${item.data.toFixed(2)}${unit}<br/>`
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
                {
                    name: 'Memory',
                    type: 'line',
                    stack: 'Total',
                    data: this.filteredResources.map(res => {
                        // first responses might not contain relevant info
                        const memory = res.ps ?? 0

                        if (this.device) {
                            return memory
                        }

                        if (this.instance?.stack?.properties?.memory) {
                            // scaling down to match stack memory allocation
                            return this.capGraph((memory / this.instance.stack.properties.memory) * 100)
                        }

                        return this.capGraph(memory)
                    })
                }
            ]
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
                    formatter: (value) => {
                        const unit = this.instance ? '%' : 'mb'

                        return `${value}${unit}`
                    }
                }
            }]
        },
        filteredResources () {
            return this.resources.filter(res => res.ps && res.ts)
        }
    },
    methods: {
        onDataZoom: debounce(function (event) {
            const batch = event?.batch?.[0]

            if (batch?.type === 'datazoom') {
                this.zoom.start = batch.start
                this.zoom.end = batch.end
            }
        }, 50),
        capGraph (val) {
            switch (true) {
            case val <= 0:
                return 0
            case val >= 150:
                return 150
            default:
                return val
            }
        }
    }
}
</script>

<style scoped lang="scss">
.chart-wrapper {
    flex: 1;
    display: flex;

    .chart {
        flex: 1;
        height: 100%;
        width: 100%;
        min-height: 250px;
    }
}
</style>
