<template>
    <div class="cursor-pointer flex flex-col border-2 border-gray-300 bg-gray-200 p-3 w-52 h-full">
        <label class="h-full w-full flex flex-col">
            <slot name="header"></slot>
            <div class="text-lg font-bold text-center">{{ projectType.name }}</div>
            <div class="flex-grow text-center text-sm p-4"><div class="text-left" v-html="projectType.htmlDescription"></div></div>
            <div v-if="this.features.billing && projectType.properties.billingDescription" class="text-lg font-bold text-center m-2 mt-4">
                {{ projectType.properties.billingDescription }}
            </div>
        </label>
        <slot name="footer"></slot>
    </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
    name: 'ProjectTypeSummary',
    props: ['projectType'],
    computed: {
        ...mapState('account', ['features'])
    }
}
</script>
