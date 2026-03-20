<template>
    <div ref="messagesWrapper" class="messages-wrapper">
        <ul class="flex flex-col gap-3">
            <li v-for="message in messages" :key="message._uuid" class="flex flex-col gap-3">
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
    emits: ['resizing'],
    data () {
        return {
            resizeObserver: null,
            lastHeight: null
        }
    },
    computed: {
        ...mapGetters('product/expert', ['messages', 'isWaitingForResponse']),
        messageTypes () {
            return {
                ai: markRaw(AiMessage),
                human: markRaw(HumanMessage),
                system: markRaw(SystemMessage)
            }
        }
    },
    mounted () {
        this.mountResizeObserver()
    },
    beforeUnmount () {
        this.unmountResizeObserver()
    },
    methods: {
        mountResizeObserver () {
            const el = this.$refs.messagesWrapper
            if (!el) return

            this.lastHeight = el.offsetHeight

            this.resizeObserver = new ResizeObserver(([entry]) => {
                const newHeight = entry.contentRect.height

                if (newHeight !== this.lastHeight) {
                    this.lastHeight = newHeight
                    this.$emit('resizing')
                }
            })

            this.resizeObserver.observe(el)
        },
        unmountResizeObserver () {
            this.resizeObserver?.disconnect()
        }
    }
}
</script>

<style scoped lang="scss">
.message-wrapper {
    margin-bottom: 0.5rem;
}
</style>
