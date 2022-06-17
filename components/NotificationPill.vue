<template>
    <span class="ff-notification-pill">{{ count }}</span>
</template>

<script>
export default {
    name: 'ff-notification-pill',
    props: {
        count: {
            default: null,
            type: Number
        }
    }
}
</script>
