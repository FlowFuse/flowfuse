<template>
    <main-title title="Payload Schema" class="mt-1" />

    <div class="ff-topic-inspecting">
        <sub-title title="Schema" :icon="CodeBracketSquareIcon" />
        <topic-schema :schema="segment.inferredSchema" />
    </div>
</template>

<script>
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
        return { CodeBracketSquareIcon }
    }
}
</script>

<style scoped lang="scss">
.ff-topic-inspecting {
    background: $ff-white;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid $ff-grey-200;
}
</style>
