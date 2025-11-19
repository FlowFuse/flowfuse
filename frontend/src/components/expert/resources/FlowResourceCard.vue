<template>
    <div class="expert-flow-tile flex flex-col gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-gray-50 transition-colors overflow-auto">
        <div class="content flex gap-3">
            <div class="icon content-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <rect width="24" height="24" fill="gray" rx="4" />
                    <g clip-path="url(#a)">
                        <path fill="#fff" d="M0 12v-1.647c5.09 0 5.81-.9 6.44-1.695.72-.9 1.46-1.6 3.88-1.6v1.648c-1.76 0-2.04.354-2.51.948C6.79 10.937 5.5 12 0 12Z" />
                        <path fill="#fff" d="M8.6 16.941c-2.9 0-3.47-1.513-3.88-2.614C4.25 13.072 3.85 12 0 12v-1.647c4.67 0 5.67 1.618 6.34 3.419.38 1.015.57 1.522 2.26 1.522v1.647Z" />
                        <path fill="#fff" d="M16.78 19H9.9c-.95 0-1.72-.737-1.72-1.647v-2.47c0-.91.77-1.648 1.72-1.648h6.88c.95 0 1.72.738 1.72 1.647v2.47c0 .91-.77 1.648-1.72 1.648Zm0-4.118H9.9v2.47h6.88v-2.47Zm1.5-4.117H11.4c-.95 0-1.72-.738-1.72-1.647v-2.47c0-.91.77-1.648 1.72-1.648h6.88c.95 0 1.72.737 1.72 1.647v2.47c0 .91-.77 1.648-1.72 1.648Zm0-4.118H11.4v2.47h6.88v-2.47Z" />
                    </g>
                    <defs>
                        <clipPath id="a">
                            <path fill="#fff" d="M0 5h20v14H0z" />
                        </clipPath>
                    </defs>
                </svg>
            </div>
            <div class="flex flex-1 flex-col overflow-auto">
                <div class="flex items-start justify-between gap-2">
                    <h6>{{ flow.title }}</h6>
                    <div class="actions flex items-start gap-4">
                        <button class="text-gray-600 expand flex items-center" @click="flowsExpanded = !flowsExpanded">
                            <span>Flows</span>
                            <chevron-down-icon v-if="flowsExpanded" class="h-4 w-4" />
                            <chevron-up-icon v-if="!flowsExpanded" class="h-4 w-4" />
                        </button>
                        <text-copier :text="flowsJson" :showText="false" />
                    </div>
                </div>
                <p class="text-xs" style="margin-bottom: 0;">
                    <span>Category: </span>
                    <span>{{ flow.metadata?.category }}</span>
                </p>
            </div>
        </div>
        <div class="flow--viewer-wrapper flex overflow-auto rounded-md ml-8" :class="{hidden: flowsExpanded}">
            <flow-viewer v-if="!flowsExpanded" :flow="flow.metadata.flows" />
        </div>
    </div>
</template>

<script>
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid'

import TextCopier from '../../TextCopier.vue'
import FlowViewer from '../../flow-viewer/FlowViewer.vue'

export default {
    name: 'StandardResourceCard',
    components: { TextCopier, FlowViewer, ChevronUpIcon, ChevronDownIcon },
    props: {
        flow: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            flowsExpanded: true
        }
    },
    computed: {
        flowsJson () {
            return JSON.stringify(this.flow.metadata.flows, null, 2)
        }
    }
}
</script>

<style scoped lang="scss">
.expert-flow-tile {
    .content {}

    .flow--viewer-wrapper {
        max-height: 500px;
        flex: 1 1 auto;
        min-height: 0;
        flex-direction: column;
        position: relative;
    }
}
</style>
