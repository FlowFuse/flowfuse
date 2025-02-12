<template>
    <div class="ff-broker-hierarchy">
        <div class="unified-namespace-hierarchy">
            <div class="title mb-5 flex gap-3 items-center">
                <img src="../../../../images/icons/tree-view.svg" alt="tree-icon" class="ff-icon-sm">
                <h3 class="my-2 flex-grow" data-el="subtitle">Topic Hierarchy</h3>
                <ff-button kind="secondary" @click="toggleAgent()">
                    <template v-if="brokerState === 'connected'">
                        Stop
                    </template>
                    <template v-else>
                        Start
                    </template>
                </ff-button>
                <ff-button v-if="brokerState === 'connected'" kind="secondary" @click="refreshHierarchy()">
                    <template #icon><RefreshIcon /></template>
                </ff-button>
                <ff-button v-if="shouldDisplaySchemaButton" @click="openSchema()">
                    <template #icon-right><ExternalLinkIcon /></template>
                    Open Schema
                </ff-button>
            </div>

            <div class="space-y-6">
                <ff-loading v-if="loading" message="Loading Topics..." />

                <template v-else>
                    <section v-if="topics.length > 0" class="topics">
                        <topic-segment
                            v-for="(segment, key) in hierarchySegments"
                            :key="segment"
                            :segment="hierarchy[segment]"
                            :children="hierarchy[segment].children"
                            :has-siblings="Object.keys(hierarchy).length > 1"
                            :is-last-sibling="key === Object.keys(hierarchy).length-1"
                            :is-root="true"
                            :selected-segment="inspecting"
                            @segment-selected="segmentSelected"
                            @segment-state-changed="toggleSegmentVisibility"
                        />
                    </section>

                    <EmptyState v-else>
                        <template #img>
                            <img src="../../../../images/empty-states/mqtt-empty.png" alt="logo">
                        </template>
                        <template #header>Start Building Your Topic Hierarchy</template>
                        <template #message>
                            <p>It looks like no topics have been detected yet.</p>
                            <p>Topics are automatically detected as your MQTT clients publish events to the broker. Get started by connecting a client and publishing your first message.</p>
                            <p>Note there may be a short delay before the topics are shown here.</p>
                        </template>
                    </EmptyState>
                </template>
            </div>
        </div>
        <div v-if="!loading && topics.length > 0" class="ff-topic-inspector" style="width: 50%;">
            <div class="title mb-5 flex gap-3 items-center">
                <img src="../../../../images/icons/tree-view.svg" alt="tree-icon" class="ff-icon-sm">
                <h3 class="my-2 flex-grow" data-el="subtitle">Topic Inspector</h3>
                <div v-if="inspecting" class="flex items-center gap-4">
                    <ff-button :disabled="!hasUnsavedChanges" kind="secondary" @click="clearTopicMetaChanges()">
                        Cancel
                    </ff-button>
                    <ff-button :disabled="!hasUnsavedChanges" @click="saveTopicMeta()">
                        Save
                    </ff-button>
                </div>
            </div>
            <template v-if="inspecting">
                <div class="ff-topic-inspecting">
                    <label class="ff-topic-path">
                        <span>
                            <template v-for="(part, idx) in selectedTopicParts" :key="idx">
                                <span v-if="idx > 0">/<wbr></span>
                                <span>{{ part }}</span>
                            </template>
                        </span>
                        <text-copier :text="selectedTopic" :show-text="false" prompt-position="left" class="ff-text-copier" />
                    </label>
                    <ff-divider />
                    <FormRow v-model="inspecting.metadata.description" containerClass="max-w-full">Description</FormRow>
                </div>
                <template v-if="!isTeamBroker">
                    <div class="title mt-2 mb-2 flex gap-3 items-center">
                        <img src="../../../../images/icons/tree-view.svg" alt="tree-icon" class="ff-icon-sm">
                        <h3 class="my-2 flex-grow" data-el="subtitle">Payload Schema</h3>
                    </div>
                    <div class="ff-topic-inspecting">
                        <label class="text-gray-800 block text-sm font-medium mb-1">Detected Schema</label>
                        <topic-schema :schema="inspecting.inferredSchema" />
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
    </div>
</template>

<script>

import { ExternalLinkIcon, RefreshIcon } from '@heroicons/vue/solid'
import { mapGetters, mapState } from 'vuex'

import brokerApi from '../../../../api/broker.js'
import EmptyState from '../../../../components/EmptyState.vue'

import FormRow from '../../../../components/FormRow.vue'
import TextCopier from '../../../../components/TextCopier.vue'
import { useNavigationHelper } from '../../../../composables/NavigationHelper.js'

import TopicSchema from './components/TopicSchema.vue'
import TopicSegment from './components/TopicSegment.vue'

const { openInANewTab } = useNavigationHelper()

export default {
    name: 'BrokerHierarchy',
    components: { TopicSchema, TopicSegment, EmptyState, ExternalLinkIcon, RefreshIcon, FormRow, TextCopier },
    inject: ['brokerState'],
    data () {
        return {
            loading: false,
            topics: {},
            inspecting: null,
            expandedTopics: new Set()
        }
    },
    computed: {
        ...mapState('account', ['team']),
        ...mapGetters('account', ['featuresCheck']),
        ...mapGetters('product', ['hasFfUnsClients', 'hasBrokers']),
        hierarchy: {
            get () {
                const hierarchy = {}
                const topicLookup = {}
                // Sort topics alphabetically to ensure consistency in hierarchy generation
                this.topics.forEach(topic => {
                    topicLookup[topic.topic] = topic
                    const parts = topic.topic.split('/')
                    if (topic.topic.startsWith('/')) {
                        // Handle empty root topic
                        parts.shift()
                        parts[0] = '/' + parts[0]
                    }
                    // combine empty root topics into /{child-topic}
                    const rootName = parts.shift()

                    if (!hierarchy[rootName]) {
                        hierarchy[rootName] = {
                            name: rootName,
                            path: rootName,
                            topic: rootName,
                            id: topicLookup[rootName]?.id,
                            metadata: topicLookup[rootName]?.metadata || {},
                            originalMetadata: JSON.stringify(topicLookup[rootName]?.metadata || {}),
                            inferredSchema: topicLookup[rootName]?.inferredSchema || { type: 'unknown' },
                            isRoot: true,
                            open: this.expandedTopics.has(rootName),
                            childrenCount: 0,
                            children: {}
                        }
                    }

                    let current = hierarchy[rootName].children // Start at the root's children

                    // Traverse through the parts to build the nested structure
                    parts.forEach((part, index) => {
                        if (!current[part]) {
                            const path = hierarchy[rootName].path + (index > 0 ? `/${parts.slice(0, index).join('/')}` : '')
                            const topic = path + '/' + part
                            current[part] = {
                                name: part,
                                path,
                                topic,
                                id: topicLookup[topic]?.id,
                                metadata: topicLookup[topic]?.metadata || {},
                                originalMetadata: JSON.stringify(topicLookup[topic]?.metadata || {}),
                                inferredSchema: topicLookup[topic]?.inferredSchema || { type: 'unknown' },
                                open: this.expandedTopics.has(topic),
                                childrenCount: 0,
                                children: {}
                            }
                        }
                        current = current[part].children // Move to the next level
                    })
                })

                function calculateChildrenCount (node) {
                    if (!node.children) return 0

                    let count = 0
                    for (const childKey in node.children) {
                        const childNode = node.children[childKey]
                        count += 1 + calculateChildrenCount(childNode) // Add 1 (for the child itself) and its children's count
                    }
                    node.childrenCount = count
                    return count
                }

                for (const key in hierarchy) {
                    calculateChildrenCount(hierarchy[key])
                }
                return hierarchy
            },
            set (segment) {
                const keys = segment.topic.split('/')
                let current = this.hierarchy
                if (segment.state) {
                    this.expandedTopics.add(segment.topic)
                } else {
                    this.expandedTopics.delete(segment.topic)
                }

                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i]

                    if (!current[key]) return

                    if (i === keys.length - 1) {
                        // if it's the last segment path, we set the state
                        current[key].open = segment.state
                    } else {
                        // Moves deeper into the hierarchy
                        current = current[key].children
                    }
                }
            }
        },
        hierarchySegments () {
            return Object.keys(this.hierarchy).sort()
        },
        shouldDisplaySchemaButton () {
            // For now, only show schema on Team Broker. This will need to be extended for 3rd party
            // brokers later
            return this.featuresCheck.isMqttBrokerFeatureEnabled
        },
        selectedTopic () {
            if (!this.inspecting) {
                return ''
            }
            return this.inspecting.topic
        },
        selectedTopicParts () {
            return this.selectedTopic.split('/')
        },
        hasUnsavedChanges () {
            return this.inspecting && JSON.stringify(this.inspecting.metadata) !== this.inspecting.originalMetadata
        },
        isTeamBroker () {
            return this.$route.params.brokerId === 'team-broker'
        }
    },
    watch: {
        $route: function () {
            this.getTopics()
        }
    },
    async mounted () {
        await this.getTopics()
    },
    methods: {
        async getTopics () {
            this.loading = true
            return brokerApi.getBrokerTopics(this.team.id, this.$route.params.brokerId)
                .then(res => {
                    this.topics = res.topics || []
                    this.topics.sort((A, B) => A.topic.localeCompare(B.topic))
                })
                .catch(err => err)
                .finally(() => {
                    this.loading = false
                })
        },
        toggleSegmentVisibility (segment) {
            // trigger's the hierarchy setter
            this.hierarchy = segment
        },
        segmentSelected (segment) {
            this.inspecting = segment
        },
        openSchema () {
            openInANewTab(`/api/v1/teams/${this.team.id}/broker/${this.$route.params.brokerId}/schema.yml`, '_blank')
        },
        async saveTopicMeta () {
            if (this.inspecting.id) {
                // This is a preexisting topic in the database
                await brokerApi.updateBrokerTopic(this.team.id, this.$route.params.brokerId, this.inspecting.id, {
                    metadata: this.inspecting.metadata
                })
                this.inspecting.originalMetadata = JSON.stringify(this.inspecting.metadata)
            } else {
                // This is not a preexisting topic - so we need to create one
                // This also works for updating an existing one based on 'topic' - as it does an upsert
                await brokerApi.addBrokerTopic(this.team.id, this.$route.params.brokerId, {
                    topic: this.inspecting.topic,
                    metadata: this.inspecting.metadata
                })
                this.inspecting.originalMetadata = JSON.stringify(this.inspecting.metadata)
            }
        },
        async clearTopicMetaChanges () {
            if (this.inspecting) {
                this.inspecting.metadata = JSON.parse(this.inspecting.originalMetadata)
            }
        },
        async refreshHierarchy () {
            this.getTopics()
        },
        async toggleAgent () {
            const state = await brokerApi.getBrokerStatus(this.team.id, this.$route.params.brokerId)
            if (state.state === 'running') {
                await brokerApi.suspendBroker(this.team.id, this.$route.params.brokerId)
                this.brokerState = 'suspending'
            } else {
                await brokerApi.startBroker(this.team.id, this.$route.params.brokerId)
                this.brokerState = 'starting'
            }
        }
    }
}
</script>
<style scoped lang="scss">
.ff-broker-hierarchy {
    display: flex;
    flex-direction: row;
    gap: 12px;
}

.ff-topic-inspector {
    transition: width 0.3s;
    overflow: hidden;
}

.ff-topic-inspecting {
    background: $ff-white;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid $ff-grey-100;
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

.unified-namespace-hierarchy {
    flex-grow: 1;
    min-width: 50%;
    .topics {
        background: $ff-white;
        padding: 10px;
        border-radius: 6px;
        border: 1px solid $ff-grey-100;
    }
}

.title {
    height: 34px;
}
</style>
