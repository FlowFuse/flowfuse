<template>
    <span class="text-xs font-semibold px-1.5 py-0.5 rounded-sm capitalize shrink-0" :class="badgeClass" :data-diff-type="type">
        <slot>{{ type }}</slot>
    </span>
</template>

<script>
const BADGE_CLASSES = {
    added: 'bg-green-100 text-green-700',
    deleted: 'bg-red-100 text-red-700',
    removed: 'bg-red-100 text-red-700',
    moved: 'bg-yellow-100 text-yellow-700'
}

export default {
    name: 'DiffTypeBadge',
    props: {
        // added, changed, deleted, removed or moved
        type: {
            type: String,
            required: true
        }
    },
    computed: {
        badgeClass () {
            return BADGE_CLASSES[this.type] ?? 'bg-blue-100 text-blue-700'
        }
    }
}
</script>
