<template>
    <main-title title="Payload Schema" class="mt-1" />

    <div class="ff-topic-inspecting">
        <section>
            <sub-title title="Schema" :icon="CodeBracketSquareIcon" />
            <topic-schema :schema="segment.inferredSchema" />
        </section>

        <section>
            <sub-title title="Suggestions" :icon="LightBulbIcon" />
            <div class="p-4 border border-gray-200 bg-gray-50 rounded-md">
                <ul>
                    <li class="p-4 border border-gray-200 bg-white rounded-md">
                        el 1
                    </li>
                </ul>
            </div>
        </section>
    </div>
</template>

<script>
import { LightBulbIcon } from '@heroicons/vue/outline'

import CodeBracketSquareIcon from '../../../../../components/icons/CodeBracketSquare.js'
import MainTitle from '../components/MainTitle.vue'
import SubTitle from '../components/SubTitle.vue'
import TopicSchema from '../components/TopicSchema.vue'

export default {
    name: 'PayloadSchema',
    components: {
        SubTitle,
        MainTitle,
        TopicSchema
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
