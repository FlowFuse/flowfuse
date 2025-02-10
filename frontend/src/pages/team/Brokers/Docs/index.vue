<template>
    <div>
        <router-link class="ff-return-link" :to="{ name: 'team-unified-namespace' }">
            <ChevronLeftIcon class="ff-icon ff-icon-sm" />
            Return to FlowFuse
        </router-link>
    </div>
    <div>
        <h1>
            {{ schema.info.title }}
            <ff-button @click="downloadSchema">
                <template #icon-right><ExternalLinkIcon /></template>
                View Raw Schema
            </ff-button>
        </h1>
        <p>{{ schema.info.description }}</p>
    </div>
    <div class="ff-schema-docs-hierarchy">
        <ff-topic-docs v-for="(data, topic) in schema.channels" :key="topic" :topic="data" />
    </div>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/outline'
import { ExternalLinkIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import BrokerAPI from '../../../../api/broker.js'
import { useNavigationHelper } from '../../../../composables/NavigationHelper.js'

import FFTopicDocs from './components/TopicDocs.vue'
const { openInANewTab } = useNavigationHelper()

export default {
    name: 'UNSDocs',
    components: {
        'ff-topic-docs': FFTopicDocs,
        ExternalLinkIcon,
        ChevronLeftIcon
    },
    data () {
        return {
            loading: true,
            error: null,
            schema: null
        }
    },
    computed: {
        ...mapState('account', ['team']),
        brokerId () {
            return this.$route.params.brokerId
        }
    },
    async mounted () {
        await this.loadSchema()
    },
    methods: {
        async loadSchema () {
            this.loading = true
            return BrokerAPI.getJsonSchema(this.team.id, this.brokerId)
                .then((response) => {
                    this.schema = response
                    this.loading = false
                }).catch((error) => {
                    console.error(error)
                    this.loading = false
                })
        },
        downloadSchema () {
            openInANewTab(`/api/v1/teams/${this.team.id}/broker/${this.brokerId}/schema.yml`, '_blank')
        }
    }
}
</script>
<style lang="scss" scoped>
.ff-return-link {
    padding: 9px 12px;
    border-radius: 6px;
    border: 1px solid $ff-grey-200;
    transition: border-color 0.3s;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    &:hover {
        border-color: $ff-indigo-500;
        color: $ff-indigo-500;
        cursor: pointer;
    }
}
.ff-schema-docs-hierarchy {
    margin: 24px 0;
    display: flex;
    gap: 12px;
    flex-direction: column;
}
h1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>
