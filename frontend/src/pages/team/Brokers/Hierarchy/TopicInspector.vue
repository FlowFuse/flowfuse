<template>
    <div class="ff-topic-inspector">
        <main-title title="Topic Inspector">
            <template v-if="selectedSegment" #actions>
                <ff-button :disabled="!hasUnsavedChanges" kind="secondary" @click="clearTopicMetaChanges()">
                    Cancel
                </ff-button>
                <ff-button :disabled="!hasUnsavedChanges" @click="saveTopicMeta()">
                    Save
                </ff-button>
            </template>
        </main-title>

        <template v-if="selectedSegment">
            <div class="ff-topic-inspecting">
                <label class="ff-topic-path">
                    <span>{{ localSegment.topic }}</span>
                    <text-copier :text="selectedTopic" :show-text="false" prompt-position="left" class="ff-text-copier" />
                </label>

                <ff-divider />

                <FormRow v-if="localSegment" v-model="localSegment.metadata.description" containerClass="max-w-full">
                    Description
                </FormRow>
            </div>

            <template v-if="!isTeamBroker">
                <main-title title="Payload Schema" />

                <div class="ff-topic-inspecting">
                    <sub-title title="Schema" :icon="CodeBracketSquareIcon" />
                    <topic-schema :schema="selectedSegment.inferredSchema" />
                </div>
            </template>
        </template>

        <EmptyState v-else>
            <template #img>
                <img src="../../../../images/empty-states/mqtt-empty.png" alt="logo">
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

import brokerApi from '../../../../api/broker.js'
import EmptyState from '../../../../components/EmptyState.vue'
import FormRow from '../../../../components/FormRow.vue'
import TextCopier from '../../../../components/TextCopier.vue'
import CodeBracketSquareIcon from '../../../../components/icons/CodeBracketSquare.js'

import MainTitle from './components/MainTitle.vue'
import SubTitle from './components/SubTitle.vue'
import TopicSchema from './components/TopicSchema.vue'

export default {
    name: 'TopicInspector',
    components: {
        TopicSchema,
        FormRow,
        EmptyState,
        TextCopier,
        SubTitle,
        MainTitle
        // CodeBracketSquareIcon
    },
    props: {
        topics: {
            type: Object,
            required: true
        },
        selectedSegment: {
            type: [Object, null],
            required: true
        }
    },
    emits: ['segment-updated'],
    setup () {
        return { CodeBracketSquareIcon }
    },
    data () {
        return {
            localSegment: { ...this.selectedSegment }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        brokerId () {
            return this.$route.params.brokerId
        },
        hasUnsavedChanges () {
            return this.localSegment && JSON.stringify(this.localSegment.metadata) !== JSON.stringify(this.selectedSegment.metadata)
        },
        isTeamBroker () {
            return this.brokerId === 'team-broker'
        },
        selectedTopic () {
            if (!this.selectedSegment) {
                return ''
            }
            return this.selectedSegment.topic
        }

    },
    watch: {
        selectedSegment (segment) {
            this.localSegment = JSON.parse(JSON.stringify(segment))
        }
    },
    methods: {
        async clearTopicMetaChanges () {
            if (this.localSegment) {
                this.localSegment.metadata = JSON.parse(JSON.stringify(this.selectedSegment.metadata))
            }
        },
        async saveTopicMeta () {
            if (this.localSegment.id) {
                // This is a preexisting topic in the database
                await brokerApi.updateBrokerTopic(this.team.id, this.$route.params.brokerId, this.localSegment.id, {
                    metadata: this.localSegment.metadata
                })
                // this.localSegment.metadata = JSON.stringify(this.localSegment.metadata)
            } else {
                // This is not a preexisting topic - so we need to create one
                // This also works for updating an existing one based on 'topic' - as it does an upsert
                await brokerApi.addBrokerTopic(this.team.id, this.$route.params.brokerId, {
                    topic: this.localSegment.topic,
                    metadata: this.localSegment.metadata
                })
                // this.localSegment.originalMetadata = JSON.stringify(this.localSegment.metadata)
            }
            this.$emit('segment-updated', this.localSegment)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-topic-inspector {
    flex: 1;
    min-width: 50%;
    transition: width 0.3s;
    overflow: hidden;

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
}
</style>
