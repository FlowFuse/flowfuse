<template>
    <div class="ff-topic-inspector">
        <main-title title="Topic Inspector">
            <template #actions>
                <ff-toggle-switch v-if="isTeamBroker" v-ff-tooltip:left="'Monitor Broker for Smart Schema Suggestions. This will automatically stop after 24 hours.'" v-model="agentActive" :disabled="agentActive">
                    <StatusOnlineIcon />
                </ff-toggle-switch>
                <ff-toggle-switch v-else v-ff-tooltip:left="'FlowFuse will automatically monitor third-party brokers for Schema suggestions'" :disabled="true" :modelValue="true">
                    <StatusOnlineIcon />
                </ff-toggle-switch>
                <template v-if="segment">
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

import { StatusOnlineIcon } from '@heroicons/vue/outline'
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
        PayloadMetadata,
        StatusOnlineIcon
    },
    props: {
        brokerState: {
            type: String,
            required: true
        },
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
            localSegment: { ...this.segment },
            agentActive: false
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
        },
        isTeamBroker () {
            return this.brokerId === 'team-broker'
        },
        isTeamBrokerAgentRunning () {
            // this.brokerState here refers to the MQTT Agent state, not the broker state
            return this.isTeamBroker && this.brokerState === 'connected'
        }
    },
    watch: {
        segment: {
            deep: true,
            handler (segment) {
                this.localSegment = JSON.parse(JSON.stringify(segment))
            }
        },
        agentActive (value) {
            // turn on or off the agent
            if (value === true) {
                this.startTeamBrokerAgent()
            } else {
                // stop it
            }
        },
        isTeamBrokerAgentRunning: {
            handler (value) {
                console.log('agent is running', value)
                // if it's now connected, display this in the UI
                if (value === true) {
                    this.agentActive = true
                } else {
                    this.agentActive = false
                }
            },
            immediate: true
        }
    },
    methods: {
        toggleTeamBrokerAgent () {
            console.log(this.agentActive)
        },
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
        },
        startTeamBrokerAgent () {
            brokerApi.startBroker(this.team.id, 'team-broker')
            alerts.emit('MQTT Payload Schema will be collected for the next 24 hours', 'confirmation')
        }
    }
}
</script>

<style scoped lang="scss">
.ff-topic-inspector {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    transition: width 0.3s;
    overflow: auto;
}
</style>
