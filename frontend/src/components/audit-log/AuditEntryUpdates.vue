<template>
    <template v-for="(update, $index) in updates" :key="update.key">
        '{{ update.key }}' has been changed from '{{ update.old }}' to '{{ update.new }}'<template v-if="$index < updates.length - 1">, </template>
    </template>
</template>

<script>
export default {
    name: 'AuditEntryUpdates',
    props: {
        updates: {
            type: Array,
            required: true
        }
    }
}
</script>
