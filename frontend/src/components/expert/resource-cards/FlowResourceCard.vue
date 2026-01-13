<template>
    <div class="flex flex-col gap-3 p-3 bg-white border border-gray-200 rounded-lg">
        <div class="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" class="flex-shrink-0 w-4 h-4 mt-0.5">
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
            <div class="flex-1 flex flex-col gap-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                    <div class="text-sm font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">{{ flow.title }}</div>
                    <div class="flex items-start gap-2 flex-shrink-0 -mt-1">
                        <button class="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 flex items-center transition-colors duration-200 rounded px-2 py-1" @click="flowsExpanded = !flowsExpanded">
                            <span>Preview</span>
                            <chevron-down-icon v-if="flowsExpanded" class="h-4 w-4" />
                            <chevron-up-icon v-if="!flowsExpanded" class="h-4 w-4" />
                        </button>
                        <text-copier v-if="!canImportFlows" :text="flowsJson" :showText="false" />
                        <ff-button v-else size="small" kind="secondary" @click="importFlows">Import</ff-button>
                    </div>
                </div>
                <div class="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    {{ flow.metadata?.category }}
                </div>
            </div>
        </div>
        <div class="flex overflow-auto ml-8 max-h-[500px] flex-col relative" :class="{hidden: flowsExpanded}">
            <flow-viewer v-if="!flowsExpanded" :flow="flow.metadata.flows" />
        </div>
    </div>
</template>

<script>
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid'
import { mapActions, mapGetters } from 'vuex'

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
        ...mapGetters('product/expert', ['canImportFlows']),
        flowsJson () {
            return JSON.stringify(this.flow.metadata.flows, null, 2)
        }
    },
    methods: {
        ...mapActions('product/assistant', ['sendFlowsToImport']),
        importFlows () {
            this.sendFlowsToImport(this.flowsJson)
            // TODO: hide the ff-expert panel after importing. Ideally after a "success" message is received from the assistant
        }
    }
}
</script>

<style scoped lang="scss">
// Minimal scoped styles - most styling is handled by Tailwind classes in template
</style>
