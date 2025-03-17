<template>
    <div class="ff-topic-inspecting">
        <label class="ff-topic-path">
            <span>{{ segment.topic }}</span>
            <text-copier :text="selectedTopic" :show-text="false" prompt-position="left" class="ff-text-copier" />
        </label>

        <ff-divider />

        <FormRow v-if="segment" v-model="localSegment.metadata.description" containerClass="max-w-full">
            Description
        </FormRow>
    </div>
</template>

<script>
import FormRow from '../../../../../components/FormRow.vue'
import TextCopier from '../../../../../components/TextCopier.vue'

export default {
    name: 'PayloadMetadata',
    components: {
        FormRow,
        TextCopier
    },
    props: {
        segment: {
            type: Object,
            required: true
        }
    },
    emits: ['segment-updated'],
    data () {
        return {
            localSegment: this.segment
        }
    },
    computed: {
        selectedTopic () {
            return this.segment.topic
        }
    },
    watch: {
        localSegment: {
            deep: true,
            handler (segment) {
                this.$emit('segment-updated', segment)
            }
        },
        segment (segment) {
            this.localSegment = segment
        }
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

.ff-topic-path {
    display: flex;
    background-color: $ff-indigo-50;
    color: $ff-indigo-600;
    border-radius: 6px;
    border: 1px solid $ff-indigo-100;
    padding: 6px;
    font-weight: 600;
    & > span:first-child {
        flex-grow: 1
    }
    & > span:last-child {
        flex-grow: 0
    }
}
</style>
