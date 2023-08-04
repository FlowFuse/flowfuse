<template>
    <div class="ff-page-header border-b border-gray-300 text-gray-500 justify-between px-7 pt-7 gap-y-4 items-center">
        <div class="flex flex-wrap justify-between pb-4">
            <div class="flex">
                <div class="w-full flex items-center md:w-auto mr-8 gap-x-2">
                    <slot name="hero">
                        <div class="flex-grow items-center inline-flex flex-wrap">
                            <div class="flex items-center mr-6">
                                <slot name="breadcrumbs" />
                                <ff-nav-breadcrumb data-el="page-name">{{ title }}</ff-nav-breadcrumb>
                                <InformationCircleIcon v-if="hasInfoDialog" class="ml-3 min-w-[20px] ff-icon text-gray-800 cursor-pointer hover:text-blue-700" @click="openInfoDialog()" />
                            </div>
                            <slot name="status" />
                            <div class="w-full text-sm mt-1">
                                <slot name="context" />
                            </div>
                        </div>
                    </slot>
                </div>
            </div>
            <ul v-if="hasTools">
                <li class="w-full md:w-auto flex-grow text-right">
                    <slot name="tools" />
                </li>
            </ul>
        </div>
        <ff-tabs v-if="tabs" :tabs="tabs" />
    </div>
    <ff-dialog v-if="hasInfoDialog" ref="help-dialog" class="ff-dialog-box--info" :header="title || 'FlowForge Info'">
        <template #default>
            <div class="flex gap-8">
                <slot name="pictogram"><img src="../images/pictograms/node_catalog_red.png"></slot>
                <div><slot name="helptext" /></div>
            </div>
        </template>
        <template #actions>
            <ff-button @click="$refs['help-dialog'].close()">Close</ff-button>
        </template>
    </ff-dialog>
</template>
<script>

import { InformationCircleIcon } from '@heroicons/vue/outline'
import { ref } from 'vue'

export default {
    name: 'SectionNavigationHeader',
    components: { InformationCircleIcon },
    props: {
        title: {
            type: String,
            default: null
        },
        tabs: {
            type: Array,
            default: null
        }
    },
    setup (props, { slots }) {
        const hasTools = ref(false)
        if (slots.tools && slots.tools().length) {
            hasTools.value = true
        }
        return {
            hasTools
        }
    },
    computed: {
        hasInfoDialog () {
            return !!this.$slots.helptext
        }
    },
    methods: {
        openInfoDialog () {
            this.$refs['help-dialog'].show()
        }
    }
}

</script>
