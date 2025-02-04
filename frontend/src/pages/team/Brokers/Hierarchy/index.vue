<template>
    <div class="unified-namespace-hierarchy">
        <div class="title mb-5 flex gap-3 items-center">
            <img src="../../../../images/icons/tree-view.svg" alt="tree-icon" class="ff-icon-sm">
            <h3 class="my-2 flex-grow" data-el="subtitle">Topic Hierarchy</h3>
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
                        @segment-state-changed="toggleSegmentVisibility"
                    />
                </section>

                <EmptyState v-else>
                    <template #img>
                        <img src="../../../../images/empty-states/mqtt-empty.png" alt="logo">
                    </template>
                    <template #header>Start Building Your Topic Hierarchy</template>
                    <template #message>
                        <p>It looks like no topics have been created yet.</p>
                        <p>Topics are automatically generated as your MQTT clients publish events to the broker. Get started by connecting a client and publishing your first message.</p>
                    </template>
                </EmptyState>
            </template>
        </div>
    </div>
</template>

<script>

import { ExternalLinkIcon } from '@heroicons/vue/solid'
import { mapGetters, mapState } from 'vuex'

import brokerClient from '../../../../api/broker.js'
import EmptyState from '../../../../components/EmptyState.vue'

import { useNavigationHelper } from '../../../../composables/NavigationHelper.js'

import TopicSegment from './components/TopicSegment.vue'

const { openInANewTab } = useNavigationHelper()

export default {
    name: 'BrokerHierarchy',
    components: { TopicSegment, EmptyState, ExternalLinkIcon },
    data () {
        return {
            loading: false,
            topics: []
        }
    },
    computed: {
        ...mapState('account', ['team']),
        ...mapGetters('account', ['featuresCheck']),
        ...mapGetters('product', ['hasFfUnsClients', 'hasBrokers']),
        hierarchy: {
            get () {
                const hierarchy = {}
                // this.topics is an array of topic objects { id, topic, metadata }.
                // For now, just turn into a flat array of topic strings - this will
                // need changing when we have to keep the metadata info attached
                const topics = this.topics.map(topic => topic.topic)
                // Sort topics alphabetically to ensure consistency in hierarchy generation
                topics.sort().forEach(topic => {
                    const parts = topic.split('/')
                    if (topic.startsWith('/')) {
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
                            open: false,
                            childrenCount: 0,
                            children: {}
                        }
                    }

                    let current = hierarchy[rootName].children // Start at the root's children

                    // Traverse through the parts to build the nested structure
                    parts.forEach((part, index) => {
                        if (!current[part]) {
                            const path = hierarchy[rootName].path + (index > 0 ? `/${parts.slice(0, index).join('/')}` : '')
                            current[part] = {
                                name: part,
                                path,
                                open: false,
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
                const keys = segment.path.split('/')
                let current = this.hierarchy

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
            return this.featuresCheck.isMqttBrokerFeatureEnabled && this.$route.params.brokerId === 'team-broker'
        }
    },
    watch: {
        $route: 'getTopics'
    },
    async mounted () {
        await this.getTopics()
    },
    methods: {
        async getTopics () {
            this.loading = true
            return brokerClient.getBrokerTopics(this.team.id, this.$route.params.brokerId)
                .then(res => {
                    this.topics = res.topics || []
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
        openSchema () {
            openInANewTab(`/api/v1/teams/${this.team.id}/broker/team-broker/schema.yml`, '_blank')
        }
    }
}
</script>
<style scoped lang="scss">
.unified-namespace-hierarchy {
    .topics {
        background: $ff-white;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid $ff-grey-100;
    }
}
</style>
