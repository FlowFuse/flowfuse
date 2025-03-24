<template>
    <BrokerError v-if="brokerState === 'error' && errorCode" :errorCode="errorCode" />
    <div class="ff-broker-hierarchy h-full">
        <TopicHierarchy
            :broker-state="brokerState"
            :loading="loading"
            :topics="topics"
            :selected-segment="selectedSegment"
            @segment-selected="segmentSelected"
            @refresh-hierarchy="getTopics"
        />

        <TopicInspector
            v-if="!loading && topics.length > 0"
            :topics="topics"
            :segment="selectedSegment"
            @segment-updated="onSegmentUpdate"
            @segment-created="getTopics"
            @segment-deleted="onDelete"
        />
    </div>
</template>

<script>
import { mapState } from 'vuex'

import brokerApi from '../../../../api/broker.js'

import BrokerError from '../components/BrokerError.vue'

import TopicHierarchy from './TopicHierarchy/index.vue'
import TopicInspector from './TopicInspector/index.vue'

export default {
    name: 'BrokerHierarchy',
    components: { TopicInspector, TopicHierarchy, BrokerError },
    props: {
        brokerState: {
            type: String,
            required: true
        },
        errorCode: {
            type: String,
            required: true
        }
    },
    emits: ['broker-updated'],
    data () {
        return {
            loading: false,
            topics: [],
            selectedSegment: null
        }
    },
    computed: {
        ...mapState('account', ['team'])
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
            try {
                const res = await brokerApi.getBrokerTopics(this.team.id, this.$route.params.brokerId)
                const topics = res.topics || []
                topics.sort((A, B) => A.topic.localeCompare(B.topic))

                // find selected segment this.selectedSegment in topics
                if (this.selectedSegment) {
                    const idx = topics.findIndex(topic => topic.topic === this.selectedSegment.topic)
                    if (idx !== -1) {
                        this.selectedSegment.id = topics[idx].id
                        this.selectedSegment.metadata = topics[idx].metadata
                    } else {
                        this.selectedSegment = null
                    }
                }
                this.topics = topics
            } catch (error) {
                console.error('Error fetching topics', error)
            } finally {
                this.loading = false
            }

            return this.topics
        },
        segmentSelected (segment) {
            this.selectedSegment = segment
        },
        onSegmentUpdate (segment) {
            const idx = this.topics.findIndex(topic => topic.id === segment.id)
            this.selectedSegment = segment
            if (idx !== -1) {
                this.topics[idx] = segment
            }
        },
        onDelete (segment) {
            const idx = this.topics.findIndex(topic => topic.id === segment.id)
            if (idx !== -1) {
                const childrenCount = segment.childrenCount
                if (childrenCount > 0) {
                    // since this topic has children and currently the API does not support deleting a topic with children
                    // we will just reset the metadata & id from the topic
                    segment.metadata = {}
                    segment.id = null
                    this.selectedSegment = segment
                } else {
                    this.topics.splice(idx, 1)
                    this.selectedSegment = null
                }
            } else {
                this.selectedSegment = null
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

@media screen and (max-width: $ff-screen-md) {
    .ff-broker-hierarchy {
        flex-wrap: wrap;
    }
}
</style>
