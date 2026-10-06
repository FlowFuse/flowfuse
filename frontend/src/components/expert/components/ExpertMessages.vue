<template>
    <div ref="messagesWrapper" class="messages-wrapper">
        <ul class="flex flex-col gap-3">
            <li v-for="entry in renderList" :key="entryKey(entry)" class="flex flex-col gap-3" :class="entry.classes">
                <collapsed-question-turn v-if="entry.kind === 'folded-turn'" :turn="entry" />
                <component :is="messageTypes[entry.message._type]" v-else-if="messageTypes[entry.message._type]" v-bind="{...entry.message}" />
            </li>
            <li v-if="isWaitingForResponse" :class="{ 'turn-start': loadingStartsTurn }">
                <expert-loading-indicator />
            </li>
        </ul>
    </div>
</template>

<script>

import { mapState } from 'pinia'
import { markRaw } from 'vue'

import { annotateTurns, buildCollapsedTranscript } from '../../../composables/Components/expert/collapseTranscript.js'

import ExpertLoadingIndicator from './ExpertLoadingIndicator.vue'

import AiMessage from './messages/AiMessage.vue'
import CollapsedQuestionTurn from './messages/CollapsedQuestionTurn.vue'
import FlowFuseEventCard from './messages/FlowFuseEventCard.vue'
import HumanMessage from './messages/HumanMessage.vue'
import SystemMessage from './messages/SystemMessage.vue'

import { isFullPageSurface } from '@/components/expert/surfaces.js'
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
                system: markRaw(SystemMessage),
                event: markRaw(FlowFuseEventCard)
            }
        },
        renderList () {
            // Full page surfaces fold answered question turns into quiet and mark the turn structure for
            // styling, while the drawer renders the transcript as-is.
            if (isFullPageSurface(this.expertSurface)) {
                return annotateTurns(buildCollapsedTranscript(this.messages))
            }
            return this.messages.map(message => ({ kind: 'message', message }))
        },
        // On a full page surface the loading indicator already sits where the Expert's next turn starts
        loadingStartsTurn () {
            if (!isFullPageSurface(this.expertSurface)) {
                return false
            }
            const last = this.renderList[this.renderList.length - 1]
            return !!last && (last.kind === 'folded-turn' || last.message._type === 'human')
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
            if (e.altKey && e.shiftKey && e.code === 'KeyD') {
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
