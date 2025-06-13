<template>
    <div class="flex gap-2">
        <div class="rounded-md flex-1 p-3 bg-green-50 text-green-600 cursor-pointer" @click="clicked('running')">
            <p class="title">Running</p>
            <span class="counter font-extrabold text-4xl">{{ stats.running ?? 0 }}</span>
        </div>
        <div class="rounded-md flex-1 p-3 bg-red-50 text-red-500 cursor-pointer" @click="clicked('error')">
            <p class="title">Error</p>
            <span class="counter font-extrabold text-4xl">{{ stats.error ?? 0 }}</span>
        </div>
        <div class="rounded-md flex-1 p-3 bg-gray-50 text-gray-500 cursor-pointer" @click="clicked('not-running')">
            <p class="title">Not Running</p>
            <span class="counter font-extrabold text-4xl">{{ stats.error ?? 0 }}</span>
        </div>
    </div>
</template>

<script>
export default {
    name: 'AtAGlanceInstanceStats',
    props: {
        typeOfInstances: {
            required: true,
            type: String
        },
        stats: {
            required: true,
            type: Object
        }
    },
    emits: ['clicked'],
    methods: {
        clicked (on) {
            this.$emit('clicked', {
                on,
                type: this.typeOfInstances
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
