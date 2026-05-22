<template>
    <message-bubble type="human">
        <streamable-content :string="content" :rich-content="true" :should-stream="false" />
    </message-bubble>
</template>

<script>
import MessageBubble from './components/MessageBubble.vue'

import StreamableContent from '@/components/expert/components/messages/components/resources/StreamableContent.vue'

export default {
    name: 'HumanMessage',
    components: { StreamableContent, MessageBubble },
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
