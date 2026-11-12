<template>
    <span class="px-1.5 py-0.5 rounded-sm font-mono text-xs" :class="pillClass" :title="text">{{ text }}</span>
</template>

<script>
const PILL_CLASSES = {
    added: 'bg-green-50 text-green-700',
    removed: 'bg-red-50 text-red-700 line-through',
    unchanged: 'bg-gray-100 text-gray-600'
}

export default {
    name: 'DiffValuePill',
    props: {
        // added, removed or unchanged
        kind: {
            type: String,
            required: true
        },
        text: {
            type: String,
            default: ''
        }
    },
    computed: {
        pillClass () {
            return PILL_CLASSES[this.kind]
        }
    }
}
</script>
