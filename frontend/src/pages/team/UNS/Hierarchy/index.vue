<template>
    <div class="unified-namespace-hierarchy">
        <div class="title mb-5 flex gap-3 items-center">
            <img src="../../../../images/icons/tree-view.svg" alt="tree-icon" class="ff-icon-sm">
            <h3 class="m-0">Topic Hierarchy</h3>
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
                    <section v-if="topics.length > 0">
                        <topic-segment
                            v-for="(segment, key) in Object.keys(hierarchy)"
                            :key="segment"
                            :segment="segment"
                            :children="hierarchy[segment]"
                            :has-siblings="Object.keys(hierarchy).length > 1"
                            :is-last-sibling="key === Object.keys(hierarchy).length-1"
                            :is-root="true"
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

import TopicSegment from './TopicSegment.vue'

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
        hierarchy () {
            const map = new Map()

            if (!this.topics || !Array.isArray(this.topics)) return {}

            this.topics.forEach(topic => {
                const parts = topic.split('/')
                let current = map

                parts.forEach(part => {
                    if (!current.has(part)) {
                        current.set(part, new Map())
                    }
                    current = current.get(part)
                })
            })

            function mapToObject (map) {
                const obj = {}
                for (const [key, value] of map.entries()) {
                    obj[key] = value instanceof Map ? mapToObject(value) : value
                }
                return obj
            }

            return mapToObject(map)
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
        }
    }
}
</script>
<style scoped lang="scss">

</style>
