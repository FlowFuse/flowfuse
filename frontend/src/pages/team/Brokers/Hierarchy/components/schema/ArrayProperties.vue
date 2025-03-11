<template>
    <div class="font-mono">
        <div>[</div>
        <div class="ml-4">...</div>
        <div v-if="items?.type" class="ml-4">({{ items.type }})</div>
        <div v-else class="ml-4">(unknown)</div>
        <div class="ml-4">...</div>
        <div>]</div>
    </div>
</template>

<script>
export default {
    name: 'ArrayProperties',
    props: {
        items: {
            type: Array,
            required: true
        }
    }
}
</script>

<style scoped lang="scss">

</style>
