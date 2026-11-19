<template>
    <collapsible-section class="ff-expert-reasoning">
        <template #header>
            <LightBulbIcon class="ff-expert-reasoning--glyph" />
            <span class="ff-expert-reasoning--label">{{ item.done ? 'Thought' : 'Thinking' }}</span>
        </template>
        <template #summary="{ expanded }">
            <div v-if="preview && !expanded" class="ff-expert-reasoning--preview" :title="preview">{{ preview }}</div>
        </template>
        <rich-content
            class="ff-expert-reasoning--body"
            :content="item.text || ''"
            :message-uuid="messageUuid"
            :answer-uuid="item._uuid"
            :should-stream="false"
        />
    </collapsible-section>
</template>

<script>
import { LightBulbIcon } from '@heroicons/vue/20/solid'

import CollapsibleSection from './CollapsibleSection.vue'
import RichContent from './resources/RichContent.vue'

// Collapsed whether streaming or done, so the block keeps its height while the reasoning
// arrives. One line under the header shows the latest sentence while streaming and the first
// once done.
export default {
    name: 'ReasoningBlock',
    components: { CollapsibleSection, LightBulbIcon, RichContent },
    props: {
        item: {
            type: Object,
            required: true
        },
        messageUuid: {
            type: String,
            required: true
        }
    },
    computed: {
        preview () {
            if (typeof this.item.text !== 'string') return ''
            const plain = this.item.text.replace(/[*_`#>]/g, '')
            const sentences = plain.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean)
            return (this.item.done ? sentences[0] : sentences[sentences.length - 1]) || ''
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-reasoning {
    max-width: 90%;
}

.ff-expert-reasoning--glyph {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
}

.ff-expert-reasoning--label {
    font-weight: 500;
    flex-shrink: 0;
}

.ff-expert-reasoning--preview {
    padding-left: 1.5rem;
    font-size: 0.8125rem;
    color: var(--ff-color-text-subtle);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ff-expert-reasoning--body {
    display: block;
    margin-top: 0.25rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--ff-color-border-subtle);
    color: var(--ff-color-text-subtle);
    font-size: 0.875rem;
    line-height: 1.5;
}
</style>
