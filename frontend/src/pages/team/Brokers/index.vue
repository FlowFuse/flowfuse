<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="pageTitle.title" :tabs="tabs">
                <template #context>
                    {{ pageTitle.context }}
                </template>

                <template #status>
                    <BrokerStatusBadge v-if="broker?.id !== 'team-broker' && !isCreationPage" :status="brokerState" :pendingStateChange="!brokerState" />
                    <BrokerStatusBadge v-else-if="activeBrokerId" :status="'connected'" />
                </template>

                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/mqtt_broker_red.png">
                </template>

                <template #helptext>
                    <p>{{ $t('ui.the') }}<b>{{ $t('ui.broker') }}</b> {{ $t('ui.featureProvidesAFrameworkForManagingAndVisualizi') }}</p>
                    <template v-if="isTeamBroker">
                        <p>{{ $t('ui.theFlowfuseTeamBrokerIsAnMqttBrokerReadyToStartU') }}</p>
                        <p>{{ $t('ui.the') }}<b>{{ $t('ui.client') }}</b> {{ $t('ui.pageAllowsYouToManageTheClientsThatHaveAccessToT') }}</p>
                    </template>
                    <p>{{ $t('ui.theTopic') }} <b>{{ $t('ui.hierarchy') }}</b> {{ $t('ui.offersAClearOrganizedVisualizationOfTheTopicsBei') }}</p>
                    <p>{{ $t('ui.theseComponentsDeliverAnIntegratedApproachToMana') }}</p>
                    <p>{{ $t('ui.documentation') }} <a href="https://flowfuse.com/docs/user/teambroker" target="_blank">{{ $t('ui.here') }}</a></p>
                </template>

                <template #tools>
                    <section v-if="!loading && shouldDisplayTools && featuresCheck.isExternalMqttBrokerFeatureEnabled" class="flex gap-3 flex-wrap">
                        <ff-toggle-switch v-if="activeBrokerId !== 'team-broker'" v-ff-tooltip:bottom="$t('ui.connectToThirdPartyBroker')" :modelValue="active" mode="async" :loading="statePending" @click="toggleAgent" />
                        <ff-toggle-switch v-else v-ff-tooltip:bottom="$t('ui.teamBrokerIsAlwaysConnected')" :modelValue="true" mode="async" :loading="statePending" :disabled="true" />
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
                            <template #icon-left><PlusIcon /></template>
                            {{ $t('ui.addBroker') }}
                        </ff-button>
                    </section>
                </template>
            </ff-page-header>
        </template>

        <ff-loading v-if="loading" :message="$t('ui.loadingBrokers')" />

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
                <span>{{ $t('ui.brokersNotAvailable') }}</span>
            </template>
            <template #message>
                <p>{{ $t('ui.the') }}<b>{{ $t('ui.brokers') }}</b> {{ $t('ui.featureProvidesACentralizedFrameworkForManagingA') }}</p>
            </template>
        </EmptyState>

        <router-view v-else :brokerState="brokerState" :errorCode="errorCode" @broker-updated="loadingState = true; brokerState = ''" />
    </ff-page>
</template>

<script>

import { PlusIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'

import brokerAPI from '../../../api/broker.js'

import EmptyState from '../../../components/EmptyState.vue'
import FfLoading from '../../../components/Loading.vue'

import usePermissions from '../../../composables/Permissions.js'
import { t } from '../../../i18n.js'
import { Roles } from '../../../utils/roles.js'

import BrokerStatusBadge from './components/BrokerStatusBadge.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountStore } from '@/stores/account.js'
import { useContextStore } from '@/stores/context.js'
import { useProductBrokersStore } from '@/stores/product-brokers.js'

export default {
    name: 'TeamBrokers',
    components: { BrokerStatusBadge, FfLoading, EmptyState, PlusIcon },
    beforeRouteLeave (to, from, next) {
        next()
        // clears uns data with a delay to avoid redirection to creation page
        setTimeout(() => this.clearUns(), 500)
    },
    setup () {
        const { hasAMinimumTeamRoleOf } = usePermissions()
        return { hasAMinimumTeamRoleOf }
    },
    data () {
        return {
            loading: true,
            loadingState: false,
            brokerStatusPollingInterval: null,
            brokerState: '',
            errorCode: ''
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountStore, ['pendingTeamChange']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useProductBrokersStore, ['hasFfUnsClients', 'hasBrokers']),
        ...mapState(useProductBrokersStore, {
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
                        .catch(e => console.error(e))
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
                    label: t('ui.hierarchy'),
                    to: { name: 'team-brokers-hierarchy', params: this.$route.params },
                    tag: 'team-brokers-hierarchy'
                },
                {
                    label: t('ui.clients'),
                    to: { name: 'team-brokers-clients', params: this.$route.params },
                    tag: 'team-brokers-clients',
                    hidden: !this.isTeamBroker
                },
                {
                    label: t('ui.settings'),
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
                    title: t('ui.addANewBroker'),
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
        },
        statePending () {
            const loading = this.loading || this.loadingState
            return loading || !this.brokerState || this.brokerState === 'suspending' || this.brokerState === 'starting'
        },
        active: {
            get () {
                return this.brokerState === 'connected'
            }
        }
    },
    watch: {
        hasFfUnsClients () {
            if (!this.loading) {
                this.redirectIfNeeded()
            }
        },
        $route (route) {
            const routeRequiresBrokerId = !this.isCreationPage

            if (!route.params.brokerId && routeRequiresBrokerId) {
                this.redirectIfNeeded()
            }
        },
        activeBrokerId: {
            handler (id) {
                this.clearBrokerStatusPollingInterval()
                if (id && this.featuresCheck.isMqttBrokerFeatureEnabled) {
                    this.getBrokerState()
                        .then(() => {
                            this.brokerStatusPollingInterval = setInterval(() => this.getBrokerState(), 5000)
                        })
                        .catch(e => {
                            this.brokerState = 'error'
                            console.error(e)
                        })
                }
            },
            immediate: true
        }
    },
    created () {
        const pendingTeamChange = !!this.pendingTeamChange

        // redirect if no minimum role
        if (!this.hasAMinimumTeamRoleOf(Roles.Member)) {
            return this.$router.push({ name: 'home' })
        }

        this.fetchData()
            .then(() => {
                this.redirectIfNeeded(pendingTeamChange)
            })
            .finally(() => {
                this.loading = false
            })
            .catch(e => console.error(e))
    },
    unmounted () {
        this.clearBrokerStatusPollingInterval()
    },
    methods: {
        ...mapActions(useProductBrokersStore, ['fetchUnsClients', 'getBrokers', 'clearUns']),
        async fetchData () {
            this.loading = true
            if (this.featuresCheck.isMqttBrokerFeatureEnabled) {
                return this.fetchUnsClients()
                    .catch(err => console.error(err))
                    .then(() => this.getBrokers())
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
            }

            return Promise.resolve()
        },
        redirectIfNeeded (pendingTeamChange = false) {
            if (this.pendingTeamChange || pendingTeamChange) return

            const brokerId = this.$route.params.brokerId
            switch (true) {
            case this.hasFfUnsClients && !this.isCreationPage && !this.hasBrokers:
                this.activeBrokerId = 'team-broker'
                break

            case !this.hasFfUnsClients && this.hasBrokers:
                this.activeBrokerId = brokerId ?? this.brokers[0].id
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
        getBrokerState () {
            return brokerAPI.getBrokerStatus(this.team.id, this.activeBrokerId)
                .then(response => {
                    if (response?.state === 'running') {
                        if (response?.status?.connected) {
                            this.brokerState = 'connected'
                        } else if (response?.status?.error === 'error_getting_status') {
                            this.brokerState = 'starting'
                        } else {
                            this.brokerState = 'error'
                            this.errorCode = response.status.error || 'ENOTFOUND'
                        }
                    } else {
                        this.brokerState = 'suspended'
                    }
                    if (this.brokerState !== 'error') {
                        this.errorCode = ''
                    }
                })
                .catch(e => {
                    this.brokerState = 'error'
                    console.error(e)
                })
                .finally(() => {
                    this.loadingState = false
                })
        },
        clearBrokerStatusPollingInterval () {
            this.brokerState = ''
            if (this.brokerStatusPollingInterval) {
                clearInterval(this.brokerStatusPollingInterval)
            }
        },
        async toggleAgent () {
            this.loadingState = true
            const state = await brokerAPI.getBrokerStatus(this.team.id, this.$route.params.brokerId)
            if (state.state === 'running') {
                await brokerAPI.suspendBroker(this.team.id, this.$route.params.brokerId)
                this.brokerState = 'suspending'
                this.loadingState = false
            } else {
                await brokerAPI.startBroker(this.team.id, this.$route.params.brokerId)
                this.brokerState = 'starting'
                this.loadingState = false
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
