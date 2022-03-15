<template>
    <div v-if="value" class="flex h-full"><SparklesIcon class="text-gray-500 w-4"></SparklesIcon></div>
</template>
<script>
    import { SparklesIcon } from '@heroicons/vue/outline'
    export default {
        name: 'ChangeIndicator',
        props: ['value'],
        components: {
            SparklesIcon
        }
    }
</script>
