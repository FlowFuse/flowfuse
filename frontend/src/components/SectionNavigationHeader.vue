<template>
    <div class="ff-page-header border-b border-gray-300 text-gray-500 justify-between px-7 pt-7 gap-y-4 items-center" data-sentry-unmask>
        <div class="flex flex-wrap justify-between pb-4 gap-y-2">
            <div class="flex-1 flex items-center md:w-auto mr-8 gap-x-2">
                <slot name="hero">
                    <div class="flex-grow items-center grid gap-1">
                        <div class="inline-flex flex-wrap gap-1">
                            <div class="flex items-center mr-6">
                                <slot name="breadcrumbs" />
                                <ff-nav-breadcrumb data-el="page-name">{{ title }}</ff-nav-breadcrumb>
                                <InformationCircleIcon v-if="hasInfoDialog" class="ml-3 min-w-[20px] ff-icon text-gray-800 cursor-pointer hover:text-blue-700" @click="openInfoDialog()" />
                            </div>
                            <slot name="status" />
                        </div>
                        <div class="w-full text-sm">
                            <slot name="context" />
                        </div>
                    </div>
                </slot>
            </div>
            <div v-if="hasTools" class="flex items-start justify-end">
                <slot name="tools" />
            </div>
        </div>
        <ff-tabs v-if="tabs" :tabs="tabs" />
    </div>
    <ff-dialog v-if="hasInfoDialog" ref="help-dialog" class="ff-dialog-box--info" :header="title || 'FlowFuse Info'">
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
