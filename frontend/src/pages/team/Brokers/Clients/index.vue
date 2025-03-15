<template>
    <div class="unified-namespace-clients">
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
                            v-if="hasAMinimumTeamRoleOf(Roles.Owner)"
                            data-action="create-client"
                            kind="primary"
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
                            <li v-for="client in filteredClients" :key="client.id" class="client" data-el="client">
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
import clipboardMixin from '../../../../mixins/Clipboard.js'
import featuresMixin from '../../../../mixins/Features.js'
import permissionsMixin from '../../../../mixins/Permissions.js'
import Alerts from '../../../../services/alerts.js'
import Dialog from '../../../../services/dialog.js'
import { Roles } from '../../../../utils/roles.js'

import BrokerClient from './components/BrokerClient.vue'

import ClientDialog from './dialogs/ClientDialog.vue'

export default {
    name: 'BrokerClients',
    components: {
        BrokerClient,
        SearchIcon,
        PlusSmIcon,
        RssIcon,
        EmptyState,
        ClientDialog
    },
    mixins: [permissionsMixin, featuresMixin, clipboardMixin],
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
        ...mapState('account', ['user', 'team', 'teamMembership', 'features']),
        ...mapState('product', {
            clients: state => state.UNS.clients
        }),
        filteredClients () {
            if (!this.filterTerm.length) return this.clients

            return this.clients.filter(client => {
                return [
                    client.username.toLowerCase().includes(this.filterTerm.toLowerCase())
                ].includes(true)
            })
        }
    },
    methods: {
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
