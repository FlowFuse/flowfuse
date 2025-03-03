<template>
    <div class="ff-topic-docs">
        <ff-accordion :label="topic.address">
            <template #content>
                <div class="ff-topic-docs-row-meta">
                    <section>
                        <label>Description:</label>
                        <p v-if="topic.description">{{ topic.description }}</p>
                        <p v-else class="ff-empty-state">No description available.</p>
                    </section>
                    <section>
                        <label>Payload Schema:</label>
                        <div class="space-y-2">
                            <div v-if="topic.schema?.type" class="mt-2 flex items-center justify-between border rounded p-3">
                                <label>Type</label>
                                <span class="capitalize">{{ topic.schema.type }}</span>
                            </div>
                            <pre v-if="showRaw" class="p-2 border border-gray-200 bg-gray-50 rounded-md">{{ topic.schema }}</pre>
                            <p v-if="!topic.schema" class="ff-empty-state">No schema available.</p>
                        </div>
                    </section>
                </div>
            </template>
        </ff-accordion>
    </div>
</template>

<script>

import FfAccordion from '../../../../../components/Accordion.vue'

export default {
    name: 'TopicDocs',
    components: {
        FfAccordion
    },
    props: {
        topic: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            expanded: false
        }
    },
    computed: {
        showRaw () {
            if (this.topic && this.topic.schema) {
                const hasTypeDefined = this.topic.schema && this.topic.schema.type
                const hasOthers = Object.keys(this.topic.schema).length > 1
                return hasTypeDefined && hasOthers
            }
            return false
        }
    }
}
</script>

<style lang="scss">
.ff-topic-docs {
    .ff-accordion {
        margin: 0;

        .ff-accordion--button{
            font-weight: bold;
            border: 1px solid $ff-blue-300;
            background-color: $ff-blue-50;
            border-radius: 6px;
            padding: 12px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;

            &:hover {
                cursor: pointer;
                background-color: $ff-blue-100;
            }
        }

        .ff-accordion--content {
            border: 1px solid $ff-blue-300;
            border-top: none;
            border-radius: 0 0 6px 6px;
            padding: 12px;

            .ff-topic-docs-row-meta {
                section {
                    margin-bottom: 15px;

                    label {
                        display: block;
                        font-weight: bold;
                        margin-bottom: 3px;
                    }
                    .ff-empty-state {
                        color: $ff-grey-400;
                        background-color: $ff-grey-50;
                        padding: 12px;
                        margin-top: 6px;
                    }
                }
            }
        }

        &.open {
            .ff-accordion--button {
                border-radius: 6px 6px 0 0;
            }
        }
    }
}
</style>
