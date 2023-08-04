<template>
    <span class="ff-notification-pill">{{ count }}</span>
</template>

<script>
export default {
    name: 'FfNotificationPill',
    props: {
        count: {
            default: null,
            type: Number
        }
    }
}
</script>
