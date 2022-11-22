<template>
    <span>
        <span v-if="lastSeenSince">{{ lastSeenSince }}</span>
        <span
            v-else
            class="italic text-gray-500"
        >
            never
        </span>
    </span>
</template>

<script>
export default {
    name: 'LastSeen',
    props: {
        lastSeenSince: {
            required: true,
            type: String
        }
    }
}
</script>
