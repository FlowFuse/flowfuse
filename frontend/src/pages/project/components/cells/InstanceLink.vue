<template>
    <template v-if="id">
        <router-link :to="{ name: 'Instance', params: { id }}">{{ name }}</router-link>
    </template>
    <template v-else><span class="italic text-gray-500">Unassigned</span></template>
</template>

<script>
// TODO This should link to the connected devices page for an instance (once one exists)

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
