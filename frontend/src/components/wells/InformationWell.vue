<template>
    <div
        class="information-well p-5 bg-white rounded-md shadow-md border border-gray-200 flex-1 flex flex-col gap-4 mb-4"
    >
        <slot />
    </div>
</template>

<script>
export default {
    name: 'InformationWell'
}
</script>

<style scoped lang="scss">
</style>
