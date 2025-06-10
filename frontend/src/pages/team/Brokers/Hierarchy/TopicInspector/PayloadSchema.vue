<template>
    <main-title title="Payload Schema" class="mt-1" />

    <div class="ff-topic-inspecting">
        <section class="schema-wrapper flex flex-col overflow-auto h-full">
            <sub-title title="Schema" :icon="CodeBracketSquareIcon">
                <template v-if="canClearSuggestion" #actions>
                    <span v-ff-tooltip:left="'Clear accepted suggestion'">
                        <XCircleIcon class="ff-icon-sm cursor-pointer text-red-500" @click="$emit('clear-suggestion')" />
                    </span>
                </template>
            </sub-title>
            <topic-schema :schema="schema" />
        </section>

        <section v-if="!hasDefinedSchema && supportedInferredTypeSuggestions" class="suggestions-wrapper">
            <sub-title title="Suggestions" :icon="LightBulbIcon" />
            <topic-suggestions>
                <topic-suggestion
                    :suggestion="inferredSchema"
                    :format="inferredType"
                    @suggestion-accepted="$emit('suggestion-accepted')"
                    @suggestion-rejected="$emit('suggestion-rejected')"
                />
            </topic-suggestions>
        </section>
    </div>
</template>

<script>
import { LightBulbIcon, XCircleIcon } from '@heroicons/vue/outline'

import CodeBracketSquareIcon from '../../../../../components/icons/CodeBracketSquare.js'
import MainTitle from '../components/MainTitle.vue'
import SubTitle from '../components/SubTitle.vue'
import TopicSchema from '../components/TopicSchema.vue'
import TopicSuggestion from '../components/suggestions/TopicSuggestion.vue'
import TopicSuggestions from '../components/suggestions/TopicSuggestions.vue'

export default {
    name: 'PayloadSchema',
    components: {
        SubTitle,
        MainTitle,
        TopicSchema,
        TopicSuggestions,
        TopicSuggestion,
        XCircleIcon
    },
    props: {
        segment: {
            required: true,
            type: Object
        }
    },
    emits: ['suggestion-accepted', 'suggestion-rejected', 'clear-suggestion', 'preview-suggestion'],
    setup () {
        return { CodeBracketSquareIcon, LightBulbIcon }
    },
    computed: {
        hasDefinedSchema () {
            return Object.prototype.hasOwnProperty.call(this.segment.metadata, 'schema')
        },
        schema () {
            return this.segment.metadata.schema ?? null
        },
        inferredType () {
            return this.segment.inferredSchema.type ?? null
        },
        inferredSchema () {
            return this.segment.inferredSchema
        },
        supportedInferredTypeSuggestions () {
            return ['number', 'string', 'boolean', 'object'].includes(this.inferredType)
        },
        canClearSuggestion () {
            return this.hasDefinedSchema || this.segment.metadata.schema === null
        }
    }
}
</script>

<style scoped lang="scss">
.ff-topic-inspecting {
    display: flex;
    flex-direction: column;
    gap: 15px;
    background: $ff-white;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid $ff-grey-200;
    overflow: auto;
}
</style>
