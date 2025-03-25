<template>
    <div class="ff-topic-inspector">
        <main-title title="Topic Inspector">
            <template v-if="segment" #actions>
                <ff-button kind="danger" :disabled="!hasId || hasChildren" @click="deleteTopic()">
                    Delete
                </ff-button>
                <ff-button :disabled="!hasUnsavedChanges" kind="secondary" @click="clearTopicMetaChanges()">
                    Cancel
                </ff-button>
                <ff-button :disabled="!hasUnsavedChanges" @click="saveTopicMeta()">
                    Save
                </ff-button>
            </template>
        </main-title>

        <template v-if="segment">
            <payload-metadata :segment="localSegment" @segment-updated="onSegmentUpdated" />

            <payload-schema
                :segment="localSegment"
                @suggestion-accepted="onSuggestionAccepted"
                @suggestion-rejected="onSuggestionRejected"
                @clear-suggestion="onSuggestionCleared"
            />
        </template>

        <EmptyState v-else>
            <template #img>
                <img src="../../../../../images/empty-states/mqtt-empty.png" alt="logo">
            </template>
            <template #header>Inspect Your Topic Hierarchy</template>
            <template #message>
                <p>Select a topic from the hierarchy to view additional information about it.</p>
            </template>
        </EmptyState>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import brokerApi from '../../../../../api/broker.js'
import EmptyState from '../../../../../components/EmptyState.vue'

import MainTitle from '../components/MainTitle.vue'

import PayloadMetadata from './PayloadMetadata.vue'
import PayloadSchema from './PayloadSchema.vue'

export default {
    name: 'TopicInspector',
    components: {
        PayloadSchema,
        EmptyState,
        MainTitle,
        PayloadMetadata
    },
    props: {
        topics: {
            type: Object,
            required: true
        },
        segment: {
            type: [Object, null],
            required: true
        }
    },
    emits: ['segment-updated', 'segment-created', 'segment-deleted'],
    data () {
        return {
            localSegment: { ...this.segment }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        brokerId () {
            return this.$route.params.brokerId
        },
        hasUnsavedChanges () {
            return this.localSegment && JSON.stringify(this.localSegment.metadata) !== JSON.stringify(this.segment.metadata)
        },
        hasId () {
            return !!this.localSegment?.id
        },
        hasChildren () {
            return this.localSegment?.childrenCount > 0
        }
    },
    watch: {
        segment: {
            deep: true,
            handler (segment) {
                this.localSegment = JSON.parse(JSON.stringify(segment))
            }
        }
    },
    methods: {
        async clearTopicMetaChanges () {
            if (this.localSegment) {
                this.localSegment.metadata = JSON.parse(JSON.stringify(this.segment.metadata))
            }
        },
        async saveTopicMeta () {
            if (this.localSegment.id) {
                // This is a preexisting topic in the database
                await brokerApi.updateBrokerTopic(this.team.id, this.$route.params.brokerId, this.localSegment.id, {
                    metadata: this.localSegment.metadata
                })
                this.$emit('segment-updated', this.localSegment)
            } else {
                // This is not a preexisting topic - so we need to create one
                // This also works for updating an existing one based on 'topic' - as it does an upsert
                await brokerApi.addBrokerTopic(this.team.id, this.$route.params.brokerId, {
                    topic: this.localSegment.topic,
                    metadata: this.localSegment.metadata
                })
                this.$emit('segment-created', this.localSegment)
            }
        },
        async deleteTopic () {
            if (this.localSegment.id) {
                await brokerApi.deleteBrokerTopic(this.team.id, this.$route.params.brokerId, this.localSegment.id)
                this.$emit('segment-deleted', this.localSegment)
            }
        },
        onSegmentUpdated (segment) {
            this.localSegment = segment
        },
        onSuggestionAccepted () {
            this.localSegment.metadata.schema = this.localSegment.inferredSchema
            this.saveTopicMeta()
        },
        onSuggestionRejected () {
            this.localSegment.metadata.schema = null
            this.saveTopicMeta()
        },
        onSuggestionCleared () {
            delete this.localSegment.metadata.schema
            this.saveTopicMeta()
        }
    }
}
</script>

<style scoped lang="scss">
.ff-topic-inspector {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 50%;
    transition: width 0.3s;
    overflow: auto;
}
</style>
