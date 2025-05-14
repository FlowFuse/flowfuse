<template>
    <SectionTopMenu>
        <template #hero>
            <div class="flex items-center gap-2">
                <ChipIcon class="ff-icon ff-icon-md text-gray-800" />
                <div class="text-gray-800 text-xl font-medium whitespace-nowrap">CPU Utilisation</div>
            </div>
        </template>
    </SectionTopMenu>
    <div>
        <v-chart class="chart" :option="chartOptions" autoresize />
    </div>
</template>

<script>
import { ChipIcon } from '@heroicons/vue/outline'
import { PieChart } from 'echarts/charts'
import {
    LegendComponent,
    TitleComponent,
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
        [THEME_KEY]: 'dark'
    },
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        },
        isVisitingAdmin: {
            required: false,
            type: Boolean
        }
    },
    setup () {
        use([
            CanvasRenderer,
            PieChart,
            TitleComponent,
            TooltipComponent,
            LegendComponent
        ])
    },
    data () {
        return {
            resources: [],
            chartOptions: {
                title: {
                    text: 'Traffic Sources',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b} : {c} ({d}%)'
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    data: ['Direct', 'Email', 'Ad Networks', 'Video Ads', 'Search Engines']
                },
                series: [
                    {
                        name: 'Traffic Sources',
                        type: 'pie',
                        radius: '55%',
                        center: ['50%', '60%'],
                        data: [
                            { value: 335, name: 'Direct' },
                            { value: 310, name: 'Email' },
                            { value: 234, name: 'Ad Networks' },
                            { value: 135, name: 'Video Ads' },
                            { value: 1548, name: 'Search Engines' }
                        ],
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
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
    height: 100vh;
}
</style>
