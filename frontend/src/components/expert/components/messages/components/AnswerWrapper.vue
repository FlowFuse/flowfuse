<template>
    <message-bubble ref="messageBubble" type="ai">
        <answer-badge v-if="!isChatAnswer" :kind="answer.kind" />

        <rich-content
            v-if="shouldShowRichContent"
            :content="answer.content"
            :message-uuid="messageUuid"
            :answer-uuid="answer._uuid"
            :should-stream="shouldStream"
            class="mb-3"
            @streaming-complete="onComponentComplete('rich-content')"
        />

        <guide-header
            v-if="shouldShowGuideHeader"
            :title="answer.title"
            :summary="answer.summary"
            :should-stream="shouldStream"
            class="mt-3"
            @streaming-complete="onComponentComplete('guide-header')"
        />

        <guide-steps-list
            v-if="shouldShowGuideStepList"
            :steps="answer.steps"
            :should-stream="shouldStream"
            class="mb-3"
            @streaming-complete="onComponentComplete('guide-steps-list')"
        />

        <resources-list
            v-if="shouldShowResourcesList"
            :resources="answer.resources"
            :should-stream="shouldStream"
            class="mb-3"
            @streaming-complete="onComponentComplete('resources-list')"
        />

        <flows-list
            v-if="shouldShowFlowsList"
            :flows="answer.flows"
            :should-stream="shouldStream"
            class="mb-3"
            @streaming-complete="onComponentComplete('flows-list')"
        />

        <packages-list
            v-if="shouldShowPackagesList"
            :packages="answer.nodePackages"
            :should-stream="shouldStream"
            class="mb-3"
            @streaming-complete="onComponentComplete('packages-list')"
        />

        <issues-list
            v-if="shouldShowIssuesList"
            :issues="answer.issues"
            :should-stream="shouldStream"
            @streaming-complete="onComponentComplete('issues-list')"
        />

        <suggestions-list
            v-if="shouldShowSuggestionsList"
            :suggestions="answer.suggestions"
            :should-stream="shouldStream"
            @streaming-complete="onComponentComplete('suggestions-list')"
        />
    </message-bubble>
</template>

<script>

import { mapActions, mapState } from 'pinia'

import useTimerHelper from '../../../../../composables/TimerHelper.js'

import AnswerBadge from './AnswerBadge.vue'
import GuideHeader from './GuideHeader.vue'
import MessageBubble from './MessageBubble.vue'
import FlowsList from './resources/FlowsList.vue'
import GuideStepsList from './resources/GuideStepsList.vue'
import IssuesList from './resources/IssuesList.vue'
import PackagesList from './resources/PackagesList.vue'
import ResourcesList from './resources/ResourcesList.vue'
import RichContent from './resources/RichContent.vue'
import SuggestionsList from './resources/SuggestionsList.vue'

import { useProductAssistantStore } from '@/stores/product-assistant.js'
import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'AnswerWrapper',
    components: {
        SuggestionsList,
        RichContent,
        PackagesList,
        FlowsList,
        AnswerBadge,
        ResourcesList,
        GuideStepsList,
        MessageBubble,
        GuideHeader,
        IssuesList
    },
    props: {
        answer: {
            type: Object,
            required: true
        },
        messageUuid: {
            type: String,
            required: true
        }
    },
    emits: ['streaming-complete'],
    setup () {
        const { waitFor } = useTimerHelper()
        return { waitFor }
    },
    data () {
        return {
            componentStreamingOrder: [],
            streamedComponents: []
        }
    },
    computed: {
        ...mapState(useProductAssistantStore, ['supportedActions']),
        ...mapState(useProductExpertStore, ['agentMode']),
        hasGuideHeader () {
            // chat answers contain generic titles, they don't need to be displayed
            return !!(this.answer.title && !this.isChatAnswer)
        },
        hasGuideSteps () {
            return Object.hasOwnProperty.call(this.answer, 'steps') && this.answer.steps.length > 0
        },
        hasResources () {
            return Object.hasOwnProperty.call(this.answer, 'resources') && this.answer.resources.length > 0
        },
        hasNodePackages () {
            return this.answer.nodePackages && this.answer.nodePackages.length > 0
        },
        hasFlows () {
            return this.answer.flows && this.answer.flows.length > 0
        },
        hasSuggestions () {
            return this.answer.suggestions && this.answer.suggestions.length > 0
        },
        hasIssues () {
            return this.answer.issues && this.answer.issues.length > 0
        },
        hasPlainContent () {
            return this.answer.content && this.answer.content.length > 0
        },
        isChatAnswer () {
            return !Object.hasOwnProperty.call(this.answer, 'kind') || this.answer.kind === 'chat'
        },
        isEditorContext () {
            // In editor context, the route name includes 'editor'
            return this.$route?.name?.includes('editor') || false
        },
        shouldShowRichContent () {
            const key = 'rich-content'
            if (!this.componentStreamingOrder.includes(key)) return false
            if (!this.hasPlainContent) return false
            if (this.componentStreamingOrder.indexOf(key) === 0) return true
            return this.streamedComponents.length >= this.componentStreamingOrder.indexOf(key)
        },
        shouldShowGuideHeader () {
            const key = 'guide-header'
            if (!this.componentStreamingOrder.includes(key)) return false
            if (!this.hasGuideHeader) return false
            if (this.componentStreamingOrder.indexOf(key) === 0) return true
            return this.streamedComponents.length >= this.componentStreamingOrder.indexOf(key)
        },
        shouldShowGuideStepList () {
            const key = 'guide-steps-list'
            if (!this.componentStreamingOrder.includes(key)) return false
            if (!this.hasGuideSteps) return false
            if (this.componentStreamingOrder.indexOf(key) === 0) return true
            return this.streamedComponents.length >= this.componentStreamingOrder.indexOf(key)
        },
        shouldShowResourcesList () {
            const key = 'resources-list'
            if (!this.componentStreamingOrder.includes(key)) return false
            if (!this.hasResources) return false
            if (this.componentStreamingOrder.indexOf(key) === 0) return true
            return this.streamedComponents.length >= this.componentStreamingOrder.indexOf(key)
        },
        shouldShowFlowsList () {
            const key = 'flows-list'
            if (!this.componentStreamingOrder.includes(key)) return false
            if (!this.hasFlows) return false
            if (this.componentStreamingOrder.indexOf(key) === 0) return true
            return this.streamedComponents.length >= this.componentStreamingOrder.indexOf(key)
        },
        shouldShowPackagesList () {
            const key = 'packages-list'
            if (!this.componentStreamingOrder.includes(key)) return false
            if (!this.hasNodePackages) return false
            if (this.componentStreamingOrder.indexOf(key) === 0) return true
            return this.streamedComponents.length >= this.componentStreamingOrder.indexOf(key)
        },
        shouldShowSuggestionsList () {
            const key = 'suggestions-list'
            if (!this.componentStreamingOrder.includes(key)) return false
            if (!this.hasSuggestions) return false
            if (this.componentStreamingOrder.indexOf(key) === 0) return true
            return this.streamedComponents.length >= this.componentStreamingOrder.indexOf(key)
        },
        shouldShowIssuesList () {
            const key = 'issues-list'
            if (!this.componentStreamingOrder.includes(key)) return false
            if (!this.hasIssues) return false
            if (this.componentStreamingOrder.indexOf(key) === 0) return true
            return this.streamedComponents.length >= this.componentStreamingOrder.indexOf(key)
        },
        shouldStream () {
            return !this.answer._streamed
        }
    },
    watch: {
        streamedComponents () {
            // when all components finished streaming, we'll mark the answer as streamed
            // so we won't stream it again when re-rendering the same content
            if (this.componentStreamingOrder.length === this.streamedComponents.length) {
                this.updateAnswerStreamedState({
                    messageUuid: this.messageUuid,
                    answerUuid: this.answer._uuid
                })
                this.$emit('streaming-complete')
            }
        }
    },
    beforeUnmount () {
        // mark the answer as streamed so we don't bother streaming the same thing from the beginning
        this.updateAnswerStreamedState({
            messageUuid: this.messageUuid,
            answerUuid: this.answer._uuid,
            agent: this.agentMode
        })
        if (this.isEditorContext) {
            this.$refs.messageBubble.$el.removeEventListener('click', this.handleClick)
        }
    },
    mounted () {
        this.buildStreamingOrder()
        if (this.isEditorContext) {
            this.$refs.messageBubble.$el.addEventListener('click', this.handleClick)
        }
    },
    methods: {
        ...mapActions(useProductExpertStore, ['updateAnswerStreamedState']),
        buildStreamingOrder () {
            // order matters
            // this is where the decision of the streaming order of components is decided
            // it should be kept in sync with the actual order of the components in the template
            if (this.hasPlainContent) this.componentStreamingOrder.push('rich-content')
            if (this.hasGuideHeader) this.componentStreamingOrder.push('guide-header')
            if (this.hasGuideSteps) this.componentStreamingOrder.push('guide-steps-list')
            if (this.hasResources) this.componentStreamingOrder.push('resources-list')
            if (this.hasFlows) this.componentStreamingOrder.push('flows-list')
            if (this.hasNodePackages) this.componentStreamingOrder.push('packages-list')
            if (this.hasIssues) this.componentStreamingOrder.push('issues-list')
            if (this.hasSuggestions) this.componentStreamingOrder.push('suggestions-list')
        },
        async onComponentComplete (key) {
            if (!this.shouldStream) await this.waitFor(200)

            this.streamedComponents.push(key)
        },
        handleClick (e) {
            const target = e.target
            // - Must be in the immersive editor
            // - Must be an A tag with the specific class and data attributes to be considered an assistant action link.
            // - Must match exactly the name of a supported action
            if (!this.isEditorContext) return
            if (!target) return
            if (target.nodeName !== 'A') return
            if (!target.classList.contains('assistant-action-link')) return
            if (!target.getAttribute('data-assistant-action-href')) return
            if (!target.getAttribute('data-action')) return

            const action = target.getAttribute('data-action')
            const supportedActionSchema = this.supportedActions?.[action]
            if (!supportedActionSchema) {
                return
            }

            e.preventDefault()
            e.stopPropagation()
            const params = {}
            for (const attr of target.attributes) {
                if (attr.name.startsWith('data-param-')) {
                    const paramName = attr.name.replace('data-param-', '')
                    const paramSchema = supportedActionSchema.params?.properties?.[paramName]
                    if (!paramSchema) continue
                    const paramType = paramSchema.type
                    let value = attr.value
                    // Basic type parsing based on schema type. Can be extended to support more complex types as needed.
                    if (paramType === 'boolean') {
                        value = value === 'true'
                    } else if (paramType === 'number') {
                        value = +value
                    }
                    params[paramName] = value
                }
            }
            useProductAssistantStore().invokeAction({ action, params })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
