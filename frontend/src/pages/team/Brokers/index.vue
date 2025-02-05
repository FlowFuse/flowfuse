<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="pageTitle.title" :tabs="tabs">
                <template #context>
                    {{ pageTitle.context }}
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

                <template #tools>
                    <section v-if="!loading && shouldDisplayTools" class="flex gap-3 flex-wrap">
                        <ff-listbox
                            v-if="brokers.length > 1"
                            v-model="activeBrokerId"
                            :options="brokerOptions"
                            data-el="brokers-list"
                        />

                        <ff-button
                            kind="secondary"
                            class="truncate"
                            data-el="add-new-broker"
                            @click="$router.push({ name: 'team-brokers-add', params: {brokerId: ''} })"
                        >
                            Add a new Broker
                        </ff-button>
                    </section>
                </template>
            </ff-page-header>
        </template>

        <ff-loading v-if="loading" message="Loading Brokers..." />

        <EmptyState
            v-else-if="!featuresCheck.isMqttBrokerFeatureEnabled"
            :featureUnavailable="!featuresCheck.isMqttBrokerFeatureEnabledForPlatform"
            :featureUnavailableToTeam="!featuresCheck.isMqttBrokerFeatureEnabledForTeam"
            class="-mt-4"
        >
            <template #img>
                <img src="../../../images/empty-states/mqtt-forbidden.png" alt="pipelines-logo">
            </template>
            <template #header>
                <span>Brokers Not Available</span>
            </template>
            <template #message>
                <p>The <b>Brokers</b> feature provides a centralized framework for managing and visualizing your entire data ecosystem, consolidating MQTT broker instances and topic structures within a single interface.</p>
            </template>
        </EmptyState>

        <router-view v-else />
    </ff-page>
</template>

<script>

import { mapActions, mapGetters, mapState } from 'vuex'

import EmptyState from '../../../components/EmptyState.vue'
import FfLoading from '../../../components/Loading.vue'

import usePermissions from '../../../composables/Permissions.js'
import FfButton from '../../../ui-components/components/Button.vue'
import { Roles } from '../../../utils/roles.js'

export default {
    name: 'TeamBrokers',
    components: { FfLoading, EmptyState, FfButton },
    beforeRouteLeave (to, from, next) {
        if (to.params?.team_slug !== from.params?.team_slug) {
            this.clearUns()
        }

        return next()
    },
    setup () {
        const { hasAMinimumTeamRoleOf } = usePermissions()

        return { hasAMinimumTeamRoleOf }
    },
    data () {
        return {
            loading: true
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'team']),
        ...mapGetters('product', ['hasFfUnsClients', 'hasBrokers']),
        ...mapState('product', {
            brokers: state => state.UNS.brokers
        }),
        activeBrokerId: {
            get () {
                const routeBrokerId = this.$route.params.brokerId
                switch (true) {
                case routeBrokerId:
                    return routeBrokerId
                case !routeBrokerId && this.hasFfUnsClients:
                    return 'team-broker'
                case !routeBrokerId && this.hasBrokers:
                    return this.brokers[0].id
                default:
                    return routeBrokerId
                }
            },
            set (brokerId) {
                switch (true) {
                case brokerId === 'team-broker':
                    this.loading = true
                    // navigate to the flowfuse broker
                    return this.$router.push({ name: 'team-brokers-hierarchy', params: { brokerId: 'team-broker' } })
                        .finally(() => {
                            this.loading = false
                        })
                default:
                    return this.$router.push({ name: 'team-brokers-hierarchy', params: { brokerId } })
                        .finally(() => {
                            this.loading = false
                        })
                }
            }
        },
        broker () {
            return this.brokers.find(broker => broker.id === this.activeBrokerId)
        },
        tabs () {
            if (this.shouldHidePageTabs || !this.$route.params.brokerId) return []

            return [
                {
                    label: 'Hierarchy',
                    to: { name: 'team-brokers-hierarchy', params: this.$route.params },
                    tag: 'team-brokers-hierarchy'
                },
                {
                    label: 'Clients',
                    to: { name: 'team-brokers-clients', params: this.$route.params },
                    tag: 'team-brokers-clients',
                    hidden: !this.isTeamBroker
                },
                {
                    label: 'Settings',
                    to: { name: 'team-brokers-settings', params: this.$route.params },
                    tag: 'team-brokers-settings',
                    hidden: this.isTeamBroker
                }
            ]
        },
        pageTitle () {
            const context = 'Centralized MQTT management and visualization.'
            const title = 'Brokers'

            switch (true) {
            case this.loading:
                return { title, context }
            case !this.featuresCheck.isMqttBrokerFeatureEnabled:
                return {
                    title,
                    context
                }
            case this.isCreationPage:
                return {
                    title: 'Add a new Broker',
                    context: 'Simplified MQTT broker setup and management.'
                }
            default:
                return {
                    title: this.broker ? this.broker.name : title,
                    context
                }
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
            return this.$route.name === 'team-brokers-first-client'
        },
        isCreationPage () {
            return ['team-brokers-first-client', 'team-brokers-new', 'team-brokers-add'].includes(this.$route.name)
        },
        brokerOptions () {
            return this.brokers.map(broker => ({ label: broker.name, value: broker.id }))
        },
        isTeamBroker () {
            return this.$route.params.brokerId === 'team-broker'
        },
        shouldDisplayTools () {
            if (this.isCreationPage) {
                return false
            }

            if (this.$route.name === 'team-brokers-clients' && this.isCreatingFirstClient) {
                return false
            }

            return true
        }
    },
    watch: {
        hasFfUnsClients: 'redirectIfNeeded',
        $route (route) {
            const routeRequiresBrokerId = !this.isCreationPage

            if (!route.params.brokerId && routeRequiresBrokerId) {
                this.redirectIfNeeded()
            }
        }
    },
    mounted () {
        if (!this.hasAMinimumTeamRoleOf(Roles.Member)) {
            return this.$router.push({ name: 'Home' })
        }
        this.fetchData()
            .then(() => this.redirectIfNeeded())
            .finally(() => {
                this.loading = false
            })
            .catch(e => e)
    },
    methods: {
        ...mapActions('product', ['fetchUnsClients']),
        async fetchData () {
            this.loading = true
            return this.$store.dispatch('product/fetchUnsClients')
                .catch(err => console.error(err))
                .then(() => this.$store.dispatch('product/getBrokers'))
                .then(() => {
                    if (
                        Object.prototype.hasOwnProperty.call(this.$route.params, 'brokerId') &&
                            !!this.$route.params.brokerId.length &&
                            !this.brokers.find(br => br.id === this.$route.params.brokerId)
                    ) {
                        return this.$router.push({ name: 'page-not-found' })
                    }
                })
                .catch(err => console.error(err))
                .finally(() => {
                    this.loading = false
                })
        },
        redirectIfNeeded () {
            const brokerId = this.$route.params.brokerId
            switch (true) {
            case this.hasFfUnsClients && !this.isCreationPage:
                this.activeBrokerId = 'team-broker'
                break

            case !this.hasFfUnsClients && this.hasBrokers:
                this.activeBrokerId = this.brokers[0].id
                break

            case this.hasFfUnsClients && !brokerId && !this.isCreationPage:
                this.activeBrokerId = 'team-broker'
                break

            case this.hasBrokers && !brokerId && !this.isCreationPage:
                this.activeBrokerId = this.brokers[0].id
                break

            case !this.hasFfUnsClients && !this.hasBrokers:
                this.loading = true
                return this.$router.push({ name: 'team-brokers-add' })
                    .finally(() => {
                        this.loading = false
                    })
            default:
                 // no redirect
            }
        },
        clearUns () {
            this.$store.dispatch('product/clearUns')
        }
    }
}
</script>

<style scoped lang="scss">

</style>
