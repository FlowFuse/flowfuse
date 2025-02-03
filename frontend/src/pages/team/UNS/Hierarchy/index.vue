<template>
    <div class="ff-broker-hierarchy">
        <div class="unified-namespace-hierarchy">
            <div class="title mb-2 flex gap-3 items-center">
                <img src="../../../../images/icons/tree-view.svg" alt="tree-icon" class="ff-icon-sm">
                <h3 class="m-0 flex-grow" data-el="subtitle">Topic Hierarchy</h3>
                <ff-button v-if="featuresCheck.isMqttBrokerFeatureEnabled" @click="openSchema()">
                    <template #icon-right><ExternalLinkIcon /></template>
                    Open Schema
                </ff-button>
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
                                <p>It looks like no topics have been created yet.</p>
                                <p>Topics are automatically generated as your MQTT clients publish events to the broker. Get started by connecting a client and publishing your first message.</p>
                            </template>
                        </EmptyState>
                    </template>
                </div>
            </template>
        </div>
        <div class="ff-topic-inspector" :style="{'width': inspecting ? '50%' : '0'}">
            <div class="title mb-2 flex gap-3 items-center">
                <img src="../../../../images/icons/tree-view.svg" alt="tree-icon" class="ff-icon-sm">
                <h3 class="m-0 flex-grow" data-el="subtitle">Topic Inspector</h3>
                <div class="flex items-center gap-4">
                    <ff-button kind="secondary" @click="clearTopicMetaChanges()">
                        Cancel
                    </ff-button>
                    <ff-button @click="saveTopicMeta()">
                        Save
                    </ff-button>
                </div>
            </div>
            <div v-if="inspecting" class="ff-topic-inspecting">
                <label class="ff-topic-path">{{ inspecting?.path === inspecting?.name ? '' : inspecting?.path + '/' }}{{ inspecting?.name }}</label>
                <ff-divider />
                <FormRow v-model="inspecting.description" containerClass="max-w-full">Description</FormRow>
            </div>
        </div>
    </div>
</template>

<script>

import { ExternalLinkIcon } from '@heroicons/vue/solid'
import { mapGetters, mapState } from 'vuex'

import brokerClient from '../../../../api/broker.js'
import EmptyState from '../../../../components/EmptyState.vue'

import FormRow from '../../../../components/FormRow.vue'
import { useNavigationHelper } from '../../../../composables/NavigationHelper.js'

import TopicSegment from './components/TopicSegment.vue'

const { openInANewTab } = useNavigationHelper()

export default {
    name: 'UNSHierarchy',
    components: { TopicSegment, EmptyState, ExternalLinkIcon, FormRow },
    data () {
        return {
            loading: false,
            topics: [],
            inspecting: null
        }
    },
    computed: {
        ...mapState('account', ['team']),
        ...mapGetters('account', ['featuresCheck']),
        hierarchy: {
            get () {
                const hierarchy = {}
                const topics = this.topics

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
        },
        segmentSelected (segment) {
            if (this.inspecting?.name === segment.name) {
                this.inspecting = null
                return
            }
            this.inspecting = segment
        },
        openSchema () {
            openInANewTab(`/api/v1/teams/${this.team.id}/broker/team-broker/schema.yml`, '_blank')
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
    display: block;
    background-color: $ff-indigo-50;
    color: $ff-indigo-600;
    border-radius: 6px;
    border: 1px solid $ff-indigo-100;
    padding: 6px;
    font-weight: 600;
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
