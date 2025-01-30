<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="pageTitle" :tabs="tabs">
                <template #context>
                    View the recently used topics and configure clients for your FlowFuse MQTT Broker.
                </template>
                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/mqtt_broker_red.png">
                </template>
                <template #helptext>
                    <p>The <b>Broker</b> feature provides a centralized framework for managing and visualizing your entire data ecosystem, consolidating MQTT broker instances and topic structures within a single interface.</p>
                    <p>Within the Broker, <b>Client</b> page allows you to manage the clients that have access to the Broker, with customizable Access Control List (ACL) rules for secure and controlled data flow.</p>
                    <p>The topic <b>Hierarchy</b> offers a clear, organized visualization of the topics being used within your broker.</p>
                    <p>Together, these components deliver an integrated approach to managing client connections, security settings, and message flow, supporting efficient and secure data communication across your system.</p>
                    <p>Documentation <a href="https://flowfuse.com/docs/user/teambroker" target="_blank">here</a></p>
                </template>
                <template v-if="shouldDisplayTools" #tools>
                    <section class="flex gap-3">
                        <ff-listbox v-if="brokers.length > 1" v-model="activeBrokerId" :options="brokerOptions" />
                        <ff-button kind="secondary" @click="$router.push({ name: 'team-brokers-add', params: {brokerId: ''} })">
                            Add a new Broker
                        </ff-button>
                    </section>
                </template>
            </ff-page-header>
        </template>

        <router-view />
    </ff-page>
</template>

<script>

import { mapActions, mapGetters, mapState } from 'vuex'

import usePermissions from '../../../composables/Permissions.js'
import FfButton from '../../../ui-components/components/Button.vue'
import { Roles } from '../../../utils/roles.js'

export default {
    name: 'TeamBrokers',
    components: { FfButton },
    setup () {
        const { hasAMinimumTeamRoleOf } = usePermissions()

        return { hasAMinimumTeamRoleOf }
    },
    data () {
        return {
            activeBrokerId: null,
            loading: true
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        ...mapGetters('product', ['hasFfUnsClients', 'hasBrokers']),
        ...mapState('product', {
            brokers: state => state.UNS.brokers
        }),
        broker () {
            return this.brokers.find(broker => broker.id === this.activeBrokerId)
        },
        tabs () {
            if (this.shouldHidePageTabs) return []

            return [
                {
                    label: 'Hierarchy',
                    to: { name: 'team-brokers-hierarchy' },
                    tag: 'team-brokers-hierarchy'
                },
                {
                    label: 'Clients',
                    to: { name: 'team-brokers-clients' },
                    tag: 'team-brokers-clients',
                    hidden: !this.isLocalBroker
                },
                {
                    label: 'Settings',
                    to: { name: 'team-brokers-settings' },
                    tag: 'team-brokers-settings',
                    hidden: this.isLocalBroker
                }
            ]
        },
        pageTitle () {
            switch (true) {
            case this.$route.name === 'team-brokers-add':
                return 'Add a new Broker'
            default:
                return this.broker ? this.broker.name : 'Brokers'
            }
        },
        shouldHidePageTabs () {
            if (['team-brokers-add', 'team-brokers-new'].includes(this.$route.name)) {
                return true
            }

            if (this.$route.name === 'team-brokers-clients' && this.isCreatingFirstClient) {
                return true
            }

            return !this.hasBrokers && (!this.hasFfUnsClients || this.isCreatingFirstClient)
        },
        isCreatingFirstClient () {
            return Object.prototype.hasOwnProperty.call(this.$route.query, 'creating-client')
        },
        brokerOptions () {
            return this.brokers.map(broker => ({ label: broker.name, value: broker.id }))
        },
        isLocalBroker () {
            return !Object.hasOwnProperty.call(this.$route.params, 'brokerId') ||
            !!(Object.hasOwnProperty.call(this.$route.params, 'brokerId') && this.$route.params.brokerId.length === 0)
        },
        shouldDisplayTools () {
            if (['team-brokers-add', 'team-brokers-new'].includes(this.$route.name)) {
                return false
            }

            if (this.$route.name === 'team-brokers-clients' && this.isCreatingFirstClient) {
                return false
            }

            return true
        }
    },
    watch: {
        team: 'fetchData',
        hasFfUnsClients: 'setActiveBrokerId',
        '$route.params.brokerId': 'setActiveBrokerId',
        activeBrokerId (brokerId) {
            if (brokerId === 'flowfuse') {
                brokerId = ''
            }
            this.$router.push({
                name: 'team-brokers',
                params: { brokerId }
            })
        }
    },
    mounted () {
        if (!this.hasAMinimumTeamRoleOf(Roles.Member)) {
            return this.$router.push({ name: 'Home' })
        }

        this.fetchData()
            .then(() => {
                if (!this.hasBrokers && (!this.hasFfUnsClients && !this.isCreatingFirstClient)) {
                    return this.$router.push({ name: 'team-brokers-add' })
                }
            })
            .then(() => this.setActiveBrokerId())
            .finally(() => {
                this.loading = false
            })
            .catch(e => e)
    },
    methods: {
        ...mapActions('product', ['fetchUnsClients']),
        async fetchData () {
            if (this.featuresCheck.isMqttBrokerFeatureEnabled) {
                this.loading = true
                return this.$store.dispatch('product/fetchUnsClients')
                    .catch(err => console.error(err))
                    .then(() => this.$store.dispatch('product/getBrokers'))
                    .catch(err => console.error(err))
                    .finally(() => {
                        this.loading = false
                    })
            }

            return Promise.resolve()
        },
        setActiveBrokerId () {
            return new Promise(() => {
                const routeBrokerId = this.$route.params.brokerId
                switch (true) {
                case !routeBrokerId && this.hasFfUnsClients:
                    this.activeBrokerId = 'flowfuse'
                    break
                case !routeBrokerId && this.hasBrokers:
                    this.activeBrokerId = this.brokers[0].id
                    break
                case this.brokers.length === 0 && !this.hasBrokers:
                    this.$router.push({ name: 'team-brokers-add' })
                    break
                default:
                    this.activeBrokerId = routeBrokerId
                }
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
