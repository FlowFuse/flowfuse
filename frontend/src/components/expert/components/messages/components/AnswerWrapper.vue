<template>
    <message-bubble type="ai">
        <answer-badge v-if="!isChatAnswer" :kind="answer.kind" />

        <rich-content
            v-if="answer.content"
            :content="answer.content"
            :message-uuid="messageUuid"
            :answer-uuid="answer._uuid"
            :streamed="answer._streamed"
            class="mb-3"
        />

        <guide-header v-if="shouldShowGuideHeader" :title="answer.title" :summary="answer.summary" class="mt-3" />

        <guide-steps-list v-if="hasGuideSteps" :steps="answer.steps" class="mb-3" />

        <resources-list v-if="hasResources" :resources="answer.resources" class="mb-3" />

        <flows-list v-if="hasFlows" :flows="answer.flows" class="mb-3" />

        <packages-list v-if="hasNodePackages" :packages="answer.nodePackages" class="mb-3" />

        <suggestions-list v-if="hasSuggestions" :suggestions="answer.suggestions" />

        <issues-list v-if="hasIssues" :issues="answer.issues" />
    </message-bubble>
</template>

<script>

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
    computed: {
        shouldShowGuideHeader () {
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
        isChatAnswer () {
            return !Object.hasOwnProperty.call(this.answer, 'kind') || this.answer.kind === 'chat'
        }
    }
}
</script>

<style scoped lang="scss">

</style>
