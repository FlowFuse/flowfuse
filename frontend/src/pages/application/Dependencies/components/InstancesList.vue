<template>
    <ul class="indent">
        <li v-for="instance in instances" :key="instance.id">
            <h6>{{ instance.name }}</h6>
        </li>
    </ul>
</template>

<script>
export default {
    name: 'InstancesList',
    props: {
        instances: {
            required: true,
            type: Object
        }
    }
}
</script>

<style scoped lang="scss">

</style>
