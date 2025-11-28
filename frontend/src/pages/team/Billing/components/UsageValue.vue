<template>
    <div>
        <span class="text-gray-500">{{ used }}</span>
        <span v-if="limit" class="text-gray-500">/{{ limit }}</span>
    </div>
</template>

<script>
export default {
    name: 'UsageValue',
    props: {
        used: {
            required: true,
            type: Number
        },
        limit: {
            required: false,
            type: Number,
            default: null
        }
    }
}
</script>

<style scoped lang="scss">

</style>
