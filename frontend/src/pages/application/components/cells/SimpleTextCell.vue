<template>
    <span>
        <span v-if="text">{{ text }}</span>
        <span
            v-else
            class="italic text-gray-500"
        >
            {{ emptyText }}
        </span>
    </span>
</template>

<script>
export default {
    name: 'SimpleTextCell',
    inheritAttrs: false,
    props: {
        text: {
            type: String,
            default: ''
        },
        emptyText: {
            type: String,
            default: ''
        }
    }
}
</script>
