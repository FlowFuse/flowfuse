<template>
    <div class="ff-section-header flex flex-wrap border-b border-gray-300 text-gray-500 justify-between px-6 py-4">
        <div class="flex">
            <div class="w-full flex items-center md:w-auto mr-8 gap-x-2">
                <slot name="hero"></slot>
            </div>
        </div>
        <ul v-if="hasTools">
            <li class="w-full md:w-auto flex-grow text-right">
                <slot name="tools"></slot>
            </li>
        </ul>
    </div>
</template>
<script>

import { ref } from 'vue'

export default {
    name: 'InstanceStatusHeader',
    props: {
        hero: {
            type: String,
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
            this.$refs['help-dialog'].show()
        }
    }
}

</script>
