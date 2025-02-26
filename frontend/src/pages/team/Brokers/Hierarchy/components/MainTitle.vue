<template>
    <div class="title mb-2 flex gap-2 items-center">
        <img v-if="!icon" src="../../../../../images/icons/tree-view.svg" alt="tree-icon" class="ff-icon-sm">
        <h3 class="my-2 flex-grow" data-el="subtitle">{{ title }}</h3>
        <div class="flex items-center gap-2">
            <slot name="actions" />
        </div>
    </div>
</template>

<script>
export default {
    name: 'MainTitle',
    props: {
        title: {
            type: String,
            required: true
        },
        icon: {
            type: Function,
            required: false,
            default: null
        }
    }
}
</script>

<style scoped lang="scss">

</style>
