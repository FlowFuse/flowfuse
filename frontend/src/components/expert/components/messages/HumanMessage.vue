<template>
    <message-bubble type="human">
        <reply-label v-if="isFullPageSurface" />
        <streamable-content :string="content" :rich-content="true" :should-stream="false" />
    </message-bubble>
</template>

<script>
import MessageBubble from './components/MessageBubble.vue'
import ReplyLabel from './components/ReplyLabel.vue'

import StreamableContent from '@/components/expert/components/messages/components/resources/StreamableContent.vue'
import { isFullPageSurface } from '@/components/expert/surfaces.js'

export default {
    name: 'HumanMessage',
    components: { StreamableContent, MessageBubble, ReplyLabel },
    inject: {
        expertSurface: {
            from: 'expert-surface',
            default: 'drawer'
        }
    },
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
    },
    computed: {
        // Full page surfaces label the person's own words; in the drawer the bubble already shows who is speaking
        isFullPageSurface () {
            return isFullPageSurface(this.expertSurface)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
