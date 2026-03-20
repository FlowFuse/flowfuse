<template>
    <message-bubble type="human">
        {{ content }}
    </message-bubble>
</template>

<script>
import MessageBubble from './components/MessageBubble.vue'

export default {
    name: 'HumanMessage',
    components: { MessageBubble },
    props: {
        content: {
            required: true,
            type: String
        },
        // eslint-disable-next-line vue/prop-name-casing
        _timestamp: {
            required: true,
            type: Number
        },
        // eslint-disable-next-line vue/prop-name-casing
        _type: {
            required: true,
            type: String
        }
    }
}
</script>

<style scoped lang="scss">

</style>
