<template>
    <template v-if="id">
        <router-link :to="{ name: 'Instance', params: { id }}">{{ name }}</router-link>
    </template>
    <template v-else><span class="italic text-gray-500">Unassigned</span></template>
</template>

<script>
export default {
    name: 'InstanceLink',
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
