<template>
    <div class="unified-namespace-hierarchy">
        <main-title title="Topic Hierarchy">
            <template v-if="selectedSegment" #actions>
                <ff-button v-if="shouldDisplayRefreshButton" kind="secondary" @click="$emit('refresh-hierarchy')">
                    <template #icon><RefreshIcon /></template>
                </ff-button>
                <ff-button v-if="shouldDisplaySchemaButton" :to="{ name: 'team-broker-docs', params: { brokerId: $route.params.brokerId } }">
                    Open Schema
                </ff-button>
            </template>
        </main-title>

        <div class="space-y-3">
            <ff-text-input
                v-model="filterTerm"
                class="ff-data-table--search"
                data-form="search"
                placeholder="Search topics..."
            >
                <template #icon><SearchIcon /></template>
                <template #icon-right>
                    <XIcon v-if="filterTerm.length" class="ff-icon-sm cursor-pointer ease-in mr-2" @click="filterTerm=''" />
                </template>
            </ff-text-input>

            <ff-loading v-if="loading" message="Loading Topics..." />

            <template v-else>
                <section v-if="filteredTopics.length > 0" class="topics">
                    <topic-segment
                        v-for="(segment, key) in hierarchySegments"
                        :key="segment"
                        :segment="hierarchy[segment]"
                        :children="hierarchy[segment].children"
                        :has-siblings="Object.keys(hierarchy).length > 1"
                        :is-last-sibling="key === Object.keys(hierarchy).length-1"
                        :is-root="true"
                        :selected-segment="selectedSegment"
                        @segment-selected="$emit('segment-selected', $event)"
                        @segment-state-changed="toggleSegmentVisibility"
                    />
                </section>

                <EmptyState v-else-if="filteredTopics.length === 0 && topics.length > 0">
                    <template #img>
                        <img src="../../../../../images/empty-states/mqtt-empty.png" alt="logo">
                    </template>
                    <template #header>No Matching Topics Found</template>
                    <template #message>
                        <p>We couldn't find any topics that match your search criteria.</p>
                        <p>Try adjusting your search or ensure that your MQTT clients have published relevant topics to the broker.</p>
                        <p>If topics were recently published, there may be a short delay before they appear.</p>
                    </template>
                </EmptyState>

                <EmptyState v-else>
                    <template #img>
                        <img src="../../../../../images/empty-states/mqtt-empty.png" alt="logo">
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
</template>

<script>
import { SearchIcon, XIcon } from '@heroicons/vue/outline'
import { RefreshIcon } from '@heroicons/vue/solid'
import { mapGetters } from 'vuex'

import EmptyState from '../../../../../components/EmptyState.vue'

import MainTitle from '../components/MainTitle.vue'

import TopicSegment from '../components/TopicSegment.vue'

export default {
    name: 'TopicHierarchy',
    components: {
        MainTitle,
        RefreshIcon,
        EmptyState,
        TopicSegment,
        SearchIcon,
        XIcon
    },
    props: {
        brokerState: {
            type: String,
            required: true
        },
        loading: {
            type: Boolean,
            required: true
        },
        topics: {
            type: Object,
            required: true
        },
        selectedSegment: {
            type: [Object, null],
            required: true
        }
    },
    emits: ['refresh-hierarchy', 'segment-selected'],
    data () {
        return {
            filterTerm: ''
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        ...mapGetters('product', ['brokerExpandedTopics']),
        brokerId () {
            return this.$route.params.brokerId
        },
        expandedTopics () {
            return this.brokerExpandedTopics(this.brokerId)
        },
        filteredTopics () {
            if (this.filterTerm.length === 0) {
                return this.topics
            }

            return this.topics.filter(topic => topic.topic.toLowerCase().includes(this.filterTerm.toLowerCase()))
        },
        hierarchy: {
            get () {
                const hierarchy = {}
                const topicLookup = {}
                // Sort topics alphabetically to ensure consistency in hierarchy generation
                this.filteredTopics.forEach(topic => {
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
                            open: this.checkIfTopicOpen(rootName),
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
                                open: this.checkIfTopicOpen(topic),
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
                this.$store.dispatch('product/handleBrokerTopicState', { topic: segment.topic, brokerId: this.brokerId })

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
        isTeamBroker () {
            return this.brokerId === 'team-broker'
        },
        shouldDisplayRefreshButton () {
            return this.isTeamBroker || this.brokerState === 'connected'
        },
        shouldDisplaySchemaButton () {
            // For now, only show schema on Team Broker. This will need to be extended for 3rd party
            // brokers later
            return this.featuresCheck.isMqttBrokerFeatureEnabled
        }
    },
    methods: {
        checkIfTopicOpen (topic) {
            return Object.prototype.hasOwnProperty.call(this.expandedTopics, topic)
        },
        toggleSegmentVisibility (segment) {
            // trigger's the hierarchy setter
            this.hierarchy = segment
        }
    }
}
</script>

<style scoped lang="scss">
.unified-namespace-hierarchy {
    flex-grow: 1;
    min-width: 50%;
    .topics {
        background: $ff-white;
        padding: 10px;
        border-radius: 6px;
        border: 1px solid $ff-grey-200;
    }
}
</style>
