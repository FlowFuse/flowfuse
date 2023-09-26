<template>
    <div v-if="value" class="flex"><SparklesIcon class="w-4" /></div>
</template>
<script>
import { SparklesIcon } from '@heroicons/vue/outline'
export default {
    name: 'ChangeIndicator',
    components: {
        SparklesIcon
    },
    props: {
        value: {
            type: Boolean,
            default: false
        }
    }
}
</script>
