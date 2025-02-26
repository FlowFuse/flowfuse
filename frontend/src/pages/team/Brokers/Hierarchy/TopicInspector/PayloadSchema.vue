<template>
    <main-title title="Payload Schema" class="mt-1" />

    <div class="ff-topic-inspecting">
        <section>
            <sub-title title="Schema" :icon="CodeBracketSquareIcon" />
            <topic-schema :schema="segment.inferredSchema" />
        </section>

        <section>
            <sub-title title="Suggestions" :icon="LightBulbIcon" />
            <topic-suggestions>
                <topic-suggestion format=".json" description="Lorem ipsum dolor sit amet, consectetur adipisicing elit. Deserunt dolores harum modi repudiandae saepe! Adipisci consectetur cum dicta dolorum ducimus id libero nam nemo nisi nobis non omnis quibusdam, suscipit!" />
            </topic-suggestions>
        </section>
    </div>
</template>

<script>
import { LightBulbIcon } from '@heroicons/vue/outline'

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
        TopicSuggestion
    },
    props: {
        segment: {
            required: true,
            type: Object
        }
    },
    setup () {
        return { CodeBracketSquareIcon, LightBulbIcon }
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
}
</style>
