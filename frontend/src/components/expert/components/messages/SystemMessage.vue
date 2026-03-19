<template>
    <message-bubble type="system" :variant="_variant">
        {{ message }}
    </message-bubble>
</template>

<script>
import MessageBubble from './components/MessageBubble.vue'

export default {
    name: 'SystemMessage',
    components: { MessageBubble },
    props: {
        // eslint-disable-next-line vue/prop-name-casing
        _type: {
            type: String,
            required: true
        },
        // eslint-disable-next-line vue/prop-name-casing
        _variant: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        // eslint-disable-next-line vue/prop-name-casing
        _timestamp: {
            type: Number,
            required: true
        }
    }
}
</script>

<style scoped lang="scss">

</style>
