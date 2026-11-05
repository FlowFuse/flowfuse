<template>
    <message-bubble type="ai" class="ff-expert-agent-message">
        <rich-content
            :content="item.text || ''"
            :message-uuid="messageUuid"
            :answer-uuid="item._uuid"
            :should-stream="false"
        />
    </message-bubble>
</template>

<script>
import MessageBubble from './MessageBubble.vue'
import RichContent from './resources/RichContent.vue'

export default {
    name: 'AgentMessage',
    components: { MessageBubble, RichContent },
    props: {
        item: {
            type: Object,
            required: true
        },
        messageUuid: {
            type: String,
            required: true
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-agent-message {
    align-self: flex-start;
    max-width: 90%;
}
</style>
