<template>
    <div class="flex flex-wrap border-b border-gray-700 mb-4 sm:mb-10 text-gray-500 justify-between">
        <div class="flex">
            <div class="w-full flex items-center md:w-auto mb-2 mr-8 gap-x-2">
                <slot name="hero">
                    <div class="flex">
                        <div class="text-gray-800 text-xl font-bold">{{ hero }}</div>
                    </div>
                </slot>
                <InformationCircleIcon v-if="hasInfoDialog" class="min-w-[20px] ff-icon text-gray-800 cursor-pointer hover:text-blue-700" @click="openInfoDialog()" />
                <span v-if="info" class="text-gray-400">{{ info }}</span>
            </div>
            <ul class="flex">
                <li class="mr-8 pt-1 flex" v-for="item in options" :key="item.name">
                    <router-link :to="item.path" class="forge-nav-item" active-class="forge-nav-item-active" :data-nav="`section-${item.name.toLowerCase()}`">{{ item.name }}</router-link>
                </li>
            </ul>
        </div>
        <ul v-if="hasTools">
            <li class="w-full md:w-auto flex-grow mb-2 text-right">
                <slot name="tools"></slot>
            </li>
        </ul>
    </div>
    <ff-dialog v-if="hasInfoDialog" ref="help-dialog" class="ff-dialog-box--info" :header="helpHeader || 'FlowForge Info'">
        <template v-slot:default>
            <div class="flex gap-8">
                <slot name="pictogram"><img src="../images/pictograms/node_catalog_red.png"/></slot>
                <div><slot name="helptext"></slot></div>
            </div>
        </template>
        <template v-slot:actions>
            <ff-button @click="$refs['help-dialog'].close()">Close</ff-button>
        </template>
    </ff-dialog>
</template>
<script>
import { InformationCircleIcon } from '@heroicons/vue/outline'
import { ref } from 'vue'

export default {
    name: 'SectionTopMenu',
    props: {
        hero: {
            type: String,
            required: true
        },
        info: {
            type: String,
            default: null
        },
        helpHeader: {
            // for the dialog that open, e.g. "FlowForge - Devices"
            type: String,
            default: null
        },
        options: {
            type: Array,
            default: null
        }
    },
    computed: {
        hasInfoDialog () {
            return !!this.$slots.helptext
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
    methods: {
        openInfoDialog () {
            console.log('hello world')
            console.log(this.$refs['help-dialog'])
            this.$refs['help-dialog'].show()
        }
    },
    components: { InformationCircleIcon }
}

</script>
