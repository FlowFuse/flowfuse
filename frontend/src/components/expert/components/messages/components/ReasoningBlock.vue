<template>
    <collapsible-section class="ff-expert-reasoning" :auto-open="!item.done">
        <template #header>
            <LightBulbIcon class="ff-expert-reasoning--glyph" />
            <span class="ff-expert-reasoning--label">{{ item.done ? 'Thought' : 'Thinking' }}</span>
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

// Open while the text is still arriving so it can be watched live, collapsed once done.
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
