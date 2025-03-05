<template>
    Registry Entry {{ pkg }}
</template>

<script>
export default {
    name: 'RegistryEntry',
    props: {
        pkg: {
            type: Object,
            required: true
        }
    }
}
</script>
