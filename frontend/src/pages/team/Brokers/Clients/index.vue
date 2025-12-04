<template>
    <div class="unified-namespace-clients">
        <feature-unavailable-to-team v-if="reachedClientLimit" class="-mt-2">
            <div>
                You’ve hit your current broker clients limit.
                <router-link class="ff-link" :to="{ name: 'TeamChangeType', params: { team_slug: team.slug } }">Upgrade</router-link>
                your team for more capacity or get in touch with sales for assistance.
            </div>
        </feature-unavailable-to-team>
        <div class="title mb-5 flex gap-3 items-center">
            <RssIcon class="ff-icon-sm" />
            <h3 class="my-2" data-el="subtitle">MQTT Broker</h3>
        </div>

        <div class="space-y-6">
            <ff-loading v-if="loading" message="Loading Clients..." />
            <template v-else>
                <section v-if="clients.length > 0">
                    <div class="header ff-data-table--options">
                        <ff-text-input
                            v-model="filterTerm"
                            class="ff-data-table--search"
                            data-form="search"
                            placeholder="Search Clients..."
                        >
                            <template #icon><SearchIcon /></template>
                        </ff-text-input>
                        <ff-button
                            v-if="hasPermission('broker:clients:create')"
                            data-action="create-client"
                            kind="primary"
                            :disabled="reachedClientLimit"
                            @click="createClient()"
                        >
                            <template #icon-left>
                                <PlusSmIcon />
                            </template>
                            Create Client
                        </ff-button>
                    </div>
                    <div class="clients-wrapper">
                        <div class="header grid grid-cols-6 gap-4 font-bold">
                            <span class="username">Username/ClientId</span>
                            <span class="rules">Rules</span>
                        </div>
                        <ul data-el="clients-list" class="clients-list">
                            <li
                                v-for="client in filteredClients" :key="client.id" class="client"
                                data-el="client" :data-client="slugify(client.owner ? client.owner.name : client.username)"
                            >
                                <broker-client
                                    :client="client"
                                    @edit-client="onEditClient"
                                    @delete-client="onDeleteClient"
                                />
                            </li>
                            <li v-if="!filteredClients.length" class="text-center p-5">
                                No clients found by that name.
                            </li>
                        </ul>
                    </div>
                </section>
                <EmptyState v-else>
                    <template #img>
                        <img src="../../../../images/empty-states/mqtt-empty.png" alt="logo">
                    </template>
                    <template #header>Create your first Broker Client</template>
                    <template #message>
                        <p>It looks like you haven't created any MQTT clients.</p>
                        <p>Get started by adding your first client to manage topic permissions and secure communications within your broker.</p>
                    </template>
                    <template #actions>
                        <section class="flex gap-4 flex-col">
                            <ff-button
                                v-if="hasPermission('broker:clients:create')"
                                data-action="create-client"
                                kind="primary"
                                @click="createClient()"
                            >
                                <template #icon-left>
                                    <PlusSmIcon />
                                </template>
                                Create Client
                            </ff-button>
                        </section>
                    </template>
                </EmptyState>
            </template>
        </div>

        <ClientDialog ref="clientDialog" />
    </div>
</template>

<script>
import { PlusSmIcon, RssIcon, SearchIcon } from '@heroicons/vue/outline'
import { mapActions, mapState } from 'vuex'

import brokerApi from '../../../../api/broker.js'
import EmptyState from '../../../../components/EmptyState.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'
import usePermissions from '../../../../composables/Permissions.js'
import { slugify } from '../../../../composables/String.js'
import clipboardMixin from '../../../../mixins/Clipboard.js'
import featuresMixin from '../../../../mixins/Features.js'
import Alerts from '../../../../services/alerts.js'
import Dialog from '../../../../services/dialog.js'
import { Roles } from '../../../../utils/roles.js'

import BrokerClient from './components/BrokerClient.vue'

import ClientDialog from './dialogs/ClientDialog.vue'

export default {
    name: 'BrokerClients',
    components: {
        FeatureUnavailableToTeam,
        BrokerClient,
        SearchIcon,
        PlusSmIcon,
        RssIcon,
        EmptyState,
        ClientDialog
    },
    mixins: [featuresMixin, clipboardMixin],
    setup () {
        const { hasPermission, hasAMinimumTeamRoleOf } = usePermissions()

        return { hasPermission, hasAMinimumTeamRoleOf }
    },
    data () {
        return {
            loading: false,
            filterTerm: ''
        }
    },
    computed: {
        Roles () {
            return Roles
        },
        ...mapState('account', ['user', 'team', 'features']),
        ...mapState('product', {
            clients: state => state.UNS.clients
        }),
        filteredClients () {
            if (!this.filterTerm.length) return this.clients
            const term = this.filterTerm.toLowerCase()
            return this.clients.filter(client => {
                const username = `${client.username}@${this.team.id}`.toLowerCase()
                const altUserName = client.owner?.name?.toLowerCase() || ''
                return [
                    username.includes(term),
                    altUserName.includes(term)
                ].includes(true)
            })
        },
        clientsLimit () {
            return this.team?.type?.properties?.teamBroker?.clients?.limit
        },
        reachedClientLimit () {
            if (!Number.isInteger(this.clientsLimit)) return false

            return this.clients.length >= this.clientsLimit
        }
    },
    mounted () {
        if (this.$route?.query?.searchQuery) {
            this.filterTerm = this.$route.query.searchQuery
        }
        // clear the query param when the component is mounted
        this.$router.replace({ query: { ...this.$route.query, searchQuery: undefined } })
    },
    methods: {
        slugify,
        ...mapActions('product', ['fetchUnsClients']),
        async createClient () {
            this.$refs.clientDialog.showCreate()
        },
        async onEditClient (client) {
            this.$refs.clientDialog.showEdit(client)
        },
        async onDeleteClient (client) {
            await Dialog.show({
                header: 'Delete Client',
                text: 'Are you sure you want to delete this Client?',
                kind: 'danger',
                confirmLabel: 'Delete'
            }, async () => {
                brokerApi.deleteClient(this.team.id, client.username)
                    .then(() => this.$store.dispatch('product/fetchUnsClients'))
                    .then(() => Alerts.emit('Successfully deleted Client.', 'confirmation'))
                    .then(async () => {
                        if (this.clients.length === 0) {
                            await this.$store.dispatch('product/removeFfBroker')
                            await this.$router.push({ name: 'team-brokers' })
                        }
                    })
                    .catch(e => e)
            })
        }
    }
}

</script>

<style lang="scss">

    .clients-wrapper {
        border: 1px solid $ff-grey-300;
        border-radius: 5px;
        overflow: hidden;

        .header {
            background: $ff-grey-100;
            padding: 10px;
            border-bottom: 1px solid $ff-grey-300;

            span {
                &.username {
                    grid-column: span 2;
                }
            }
        }

        .clients-list {
            background: $ff-white;

            .client {
                border-bottom: 1px solid $ff-grey-300;

                &:last-of-type {
                    border-bottom: none;
                }
            }
        }
    }
</style>
