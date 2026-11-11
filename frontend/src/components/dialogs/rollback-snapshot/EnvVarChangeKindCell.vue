<template>
    <span class="text-xs font-semibold px-1.5 py-0.5 rounded-sm capitalize" :class="badgeClass">{{ kind }}</span>
</template>

<script>
// Same badges as the snapshot compare dialog
const BADGE_CLASSES = {
    added: 'bg-green-100 text-green-700',
    changed: 'bg-blue-100 text-blue-700',
    removed: 'bg-red-100 text-red-700'
}

export default {
    name: 'EnvVarChangeKindCell',
    props: {
        kind: {
            type: String,
            required: true
        }
    },
    computed: {
        badgeClass () {
            return BADGE_CLASSES[this.kind]
        }
    }
}
</script>
