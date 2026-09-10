<template>
    <div ref="messagesWrapper" class="messages-wrapper">
        <ul class="flex flex-col gap-3">
            <li v-for="entry in renderList" :key="entryKey(entry)" class="flex flex-col gap-3">
                <collapsed-question-turn v-if="entry.kind === 'folded-turn'" :turn="entry" />
                <component :is="messageTypes[entry.message._type]" v-else-if="messageTypes[entry.message._type]" v-bind="{...entry.message}" />
            </li>
            <li v-if="isWaitingForResponse">
                <expert-loading-indicator />
            </li>
        </ul>
    </div>
</template>

<script>

import { mapState } from 'pinia'
import { markRaw } from 'vue'

import { buildCollapsedTranscript } from '../../../composables/Components/expert/collapseTranscript.js'

import ExpertLoadingIndicator from './ExpertLoadingIndicator.vue'

import AiMessage from './messages/AiMessage.vue'
import CollapsedQuestionTurn from './messages/CollapsedQuestionTurn.vue'
import HumanMessage from './messages/HumanMessage.vue'
import SystemMessage from './messages/SystemMessage.vue'

import { downloadData } from '@/composables/Download.js'
import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'ExpertMessages',
    components: { CollapsedQuestionTurn, ExpertLoadingIndicator },
    inject: {
        expertSurface: {
            from: 'expert-surface',
            default: 'drawer'
        }
    },
    emits: ['resizing'],
    data () {
        return {
            resizeObserver: null,
            lastHeight: null
        }
    },
    computed: {
        ...mapState(useProductExpertStore, ['messages', 'isWaitingForResponse']),
        messageTypes () {
            return {
                ai: markRaw(AiMessage),
                human: markRaw(HumanMessage),
                system: markRaw(SystemMessage)
            }
        },
        renderList () {
            // The onboarding surface folds answered question turns into quiet while the drawer renders the transcript as-is.
            if (this.expertSurface === 'onboarding') {
                return buildCollapsedTranscript(this.messages)
            }
            return this.messages.map(message => ({ kind: 'message', message }))
        }
    },
    mounted () {
        this.mountResizeObserver()
        window.addEventListener('keydown', this.onKeyDown)
    },
    beforeUnmount () {
        this.unmountResizeObserver()
        window.removeEventListener('keydown', this.onKeyDown)
    },
    methods: {
        entryKey (entry) {
            return entry.kind === 'folded-turn' ? entry.questionsMessage._uuid : entry.message._uuid
        },
        onKeyDown (e) {
            if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault()
                downloadData(this.messages, 'expert-messages.json')
            }
        },
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
