<template>
    <div class="unified-namespace-hierarchy">
        <div class="title mb-5 flex gap-3 items-center">
            <img src="../../../../images/icons/tree-view.svg" alt="tree-icon" class="ff-icon-sm">
            <h3 class="m-0" data-el="subtitle">Topic Hierarchy</h3>
        </div>

        <EmptyState
            v-if="!featuresCheck.isMqttBrokerFeatureEnabled"
            :featureUnavailable="!featuresCheck.isMqttBrokerFeatureEnabledForPlatform"
            :featureUnavailableToTeam="!featuresCheck.isMqttBrokerFeatureEnabledForTeam"
        >
            <template #img>
                <img src="../../../../images/empty-states/mqtt-forbidden.png" alt="pipelines-logo">
            </template>
            <template #header>
                <span>Topic Hierarchy Not Available</span>
            </template>
            <template #message>
                <p>The <b>Topic Hierarchy</b> offers a clear, organized visualization of topic structures, providing fine-grained control over publishing and subscribing permissions.</p>
            </template>
        </EmptyState>

        <template v-else>
            <div class="space-y-6">
                <ff-loading v-if="loading" message="Loading Clients..." />

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
        </template>
    </div>
</template>

<script>

import { mapGetters, mapState } from 'vuex'

import brokerClient from '../../../../api/broker.js'
import EmptyState from '../../../../components/EmptyState.vue'

import TopicSegment from './components/TopicSegment.vue'

export default {
    name: 'UNSHierarchy',
    components: { TopicSegment, EmptyState },
    data () {
        return {
            loading: false,
            topics: []
        }
    },
    computed: {
        ...mapState('account', ['team']),
        ...mapGetters('account', ['featuresCheck']),
        hierarchy: {
            get () {
                const hierarchy = {}
                const topics = this.topics

                topics.sort().forEach(topic => {
                    const parts = topic.split('/')
                    let current

                    let rootName
                    if (topic.startsWith('/')) {
                        // Handle paths with a leading '/'
                        rootName = parts[1] || ''
                        if (!hierarchy[rootName]) {
                            hierarchy[rootName] = {
                                name: rootName,
                                path: `/${rootName}`,
                                open: false,
                                hasEmptyRoot: true,
                                childrenCount: 0,
                                children: {}
                            }
                        }
                        current = hierarchy[rootName].children
                        parts.splice(0, 2) // Remove the empty string and root part
                    } else {
                        // Handle paths without a leading '/'
                        rootName = parts[0]
                        if (!hierarchy[rootName]) {
                            hierarchy[rootName] = {
                                name: rootName,
                                path: rootName,
                                open: false,
                                hasEmptyRoot: false,
                                childrenCount: 0,
                                children: {}
                            }
                        }
                        current = hierarchy[rootName].children
                        parts.splice(0, 1) // Remove the root part
                    }

                    parts.forEach((part, index) => {
                        if (!current[part]) {
                            current[part] = {
                                name: part,
                                path: `${hierarchy[rootName].path}/${parts.slice(0, index + 1).join('/')}`,
                                open: false,
                                hasEmptyRoot: false,
                                childrenCount: 0,
                                children: {}
                            }
                        }
                        current = current[part].children
                    })
                })

                function calculateChildrenCount (node) {
                    if (!node.children) return 0

                    let count = 0
                    for (const childKey in node.children) {
                        const childNode = node.children[childKey]
                        count += 1 + calculateChildrenCount(childNode)
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
        }
    },
    async mounted () {
        await this.getTopics()
    },
    methods: {
        async getTopics () {
            this.loading = true
            return brokerClient.getTopics(this.team.id)
                .then(res => {
                    this.topics = res
                })
                .catch(err => err)
                .finally(() => {
                    this.loading = false
                })
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
    .topics {
        background: $ff-white;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid $ff-grey-100;
    }
}
</style>
