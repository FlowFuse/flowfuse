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
        <h1>Chart goes here</h1>
    </div>
</template>

<script>
import { ChipIcon } from '@heroicons/vue/outline'

import SectionTopMenu from '../../components/SectionTopMenu.vue'
export default {
    name: 'InstancePerformance',
    components: {
        SectionTopMenu,
        ChipIcon
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
    }
}
</script>

<style scoped lang="scss">

</style>
