<template>
    <div class="ff-section-header border-b border-gray-300 text-gray-500 justify-between px-7 pt-7 gap-y-4 items-center">
        <div class="flex flex-wrap justify-between pb-4">
            <div class="flex">
                <div class="w-full flex items-center md:w-auto mr-8 gap-x-2">
                    <slot name="hero">
                        <div class="flex-grow items-center inline-flex flex-wrap" data-el="device-name">
                            <div class="flex items-center mr-6">
                                <slot name="breadcrumbs" />
                            </div>
                            <slot name="status" />
                            <div class="w-full text-sm mt-1">
                                <slot name="parent" />
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
</template>
<script>

import { ref } from 'vue'

export default {
    name: 'SectionNavigationHeader',
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
