<template>
    <div class="messages-wrapper">
        <ul class="flex flex-col gap-3">
            <li v-for="(message, index) in messages" :key="index" class="flex flex-col gap-3">
                <component :is="messageTypes[message._type]" v-if="messageTypes[message._type]" v-bind="{...message}" />
            </li>
            <li v-if="isWaitingForResponse">
                <expert-loading-indicator />
            </li>
        </ul>
    </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'

import ExpertLoadingIndicator from './ExpertLoadingIndicator.vue'

import AiMessage from './messages/AiMessage.vue'
import HumanMessage from './messages/HumanMessage.vue'
import SystemMessage from './messages/SystemMessage.vue'

export default {
    name: 'ExpertMessages',
    components: { ExpertLoadingIndicator },
    computed: {
        ...mapGetters('product/expert', ['messages', 'isWaitingForResponse']),
        messageTypes () {
            return {
                ai: markRaw(AiMessage),
                human: markRaw(HumanMessage),
                system: markRaw(SystemMessage)
            }
        }
    }
}
</script>

<style scoped lang="scss">
.message-wrapper {
    margin-bottom: 0.5rem;
}
</style>
