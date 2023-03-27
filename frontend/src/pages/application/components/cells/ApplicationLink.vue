<template>
    <template v-if="id">
        <router-link :to="{ name: 'Project', params: { id: id }}">{{ name }}</router-link>
    </template>
    <template v-else><span class="italic text-gray-500">Unassigned</span></template>
</template>

<script>
export default {
    name: 'ApplicationLink',
    inheritAttrs: false,
    props: {
        id: {
            type: String,
            default: null
        },
        name: {
            type: String,
            default: null
        }

    }
}
</script>
