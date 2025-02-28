<template>
    <BrokerError v-if="brokerState === 'error' && errorCode" :errorCode="errorCode" />
    <div class="ff-broker-hierarchy">
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
        segmentSelected (segment) {
            this.selectedSegment = segment
        },
        onSegmentUpdate (segment) {
            const idx = this.topics.findIndex(topic => topic.id === segment.id)
            this.selectedSegment = segment
            if (idx !== -1) {
                this.topics[idx] = segment
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
