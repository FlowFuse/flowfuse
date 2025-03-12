<template>
    <div class="ff-section-header flex border-b border-gray-400 mb-4 sm:mb-2 text-gray-500 justify-between min-h-12">
        <div class="w-full flex flex-nowrap justify-between mb-2 items-center gap-2">
            <div class="flex-shrink flex-grow flex-wrap max-w-full flex gap-x-2 items-baseline min-w-0">
                <div class="flex gap-2 items-center">
                    <slot name="hero">
                        <div class="flex">
                            <div class="text-gray-800 text-xl font-medium whitespace-nowrap">{{ hero }}</div>
                        </div>
                    </slot>
                    <InformationCircleIcon v-if="hasInfoDialog" class="min-w-[20px] ff-icon text-gray-800 cursor-pointer hover:text-blue-700" @click="openInfoDialog()" />
                </div>
                <div v-if="info" class="hidden sm:block text-gray-400 info truncate text-sm">{{ info }}</div>
            </div>
            <div class="actions flex-shrink-0">
                <ul v-if="options.length > 0" class="flex">
                    <li v-for="item in options" :key="item.name" class="mr-8 pt-1 flex">
                        <router-link :to="item.path" class="forge-nav-item" active-class="forge-nav-item-active" :data-nav="`section-${item.name.toLowerCase()}`">{{ item.name }}</router-link>
                    </li>
                </ul>
                <ul v-if="hasTools" class="flex-shrink-0">
                    <li class="w-full md:w-auto flex-grow text-right">
                        <slot name="tools" />
                    </li>
                </ul>
            </div>
        </div>
    </div>
    <ff-dialog v-if="hasInfoDialog" ref="help-dialog" class="ff-dialog-box--info" :header="helpHeader || 'FlowFuse Info'">
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
    name: 'SectionTopMenu',
    props: {
        hero: {
            type: String,
            default: null
        },
        info: {
            type: String,
            default: null
        },
        helpHeader: {
            // for the dialog that open, e.g. "FlowFuse - Devices"
            type: String,
            default: null
        },
        options: {
            type: Array,
            default: () => []
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
            this.$refs['help-dialog'].show()
        }
    },
    components: { InformationCircleIcon }
}

</script>

<style lang="scss">
.wrapper {
    flex: 1;

    .info {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        align-self:center;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
    }
}
</style>
