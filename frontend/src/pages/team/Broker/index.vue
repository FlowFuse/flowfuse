<template>
    <ff-page>
        <template #header>
            <ff-page-header title="MQTT Broker">
                <template #context>
                    Central hub for managing MQTT clients and defining ACL-based topic permissions.
                </template>
                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/mqtt_broker_red.png">
                </template>
                <template #helptext>
                    <p>The <b>MQTT Broker</b> page offers a streamlined interface for managing your broker instance and defining client connections.</p>
                    <p>You can create and manage MQTT clients, each with customizable Access Control List (ACL) rules to ensure secure and controlled communication. The ACL rules allow for fine-grained control over each client’s access to specific topics, supporting both publishing and subscribing actions.</p>
                    <p>This overview provides a clear and organized view of your broker’s configuration, helping you manage client connections, security settings, and message flow efficiently.</p>
                </template>
            </ff-page-header>
        </template>

        <EmptyState
            v-if="!isMqttBrokerFeatureEnabled"
            :featureUnavailable="!isMqttBrokerFeatureEnabledForPlatform"
            :featureUnavailableToTeam="!isMqttBrokerFeatureEnabledForTeam"
        >
            <template #img>
                <img src="../../../images/empty-states/mqtt.png" alt="pipelines-logo">
            </template>
            <template #header>
                <span>Broker Not Available</span>
            </template>
            <template #message>
                <p>The <b>MQTT Broker</b> page offers a streamlined interface for managing your broker instance and defining client connections.</p>
                <p>You can create and manage MQTT clients, each with customizable Access Control List (ACL) rules to ensure secure and controlled communication. The ACL rules allow for fine-grained control over each client’s access to specific topics, supporting both publishing and subscribing actions.</p>
                <p>This overview provides a clear and organized view of your broker’s configuration, helping you manage client connections, security settings, and message flow efficiently.</p>
            </template>
        </EmptyState>

        <template v-else>
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
                            <img src="../../../images/empty-states/mqtt.png" alt="logo">
                        </template>
                        <template #header>Create your first Broker Client</template>
                        <template #message>
                            <p>It looks like you haven't created any MQTT clients.</p>
                            <p>Get started by adding your first client to manage topic permissions and secure communications within your broker.</p>
                        </template>
                        <template #actions>
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
                        </template>
                    </EmptyState>
                </template>
            </div>
            <ClientDialog
                ref="clientDialog"
                :clients="clients"
                @client-created="fetchData"
                @client-updated="fetchData"
            />
        </template>
    </ff-page>
</template>

<script>
import { PlusSmIcon, SearchIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import brokerApi from '../../../api/broker.js'
import EmptyState from '../../../components/EmptyState.vue'
import clipboardMixin from '../../../mixins/Clipboard.js'
import featuresMixin from '../../../mixins/Features.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'
import { Roles } from '../../../utils/roles.js'

import BrokerClient from './components/BrokerClient.vue'

import ClientDialog from './dialogs/ClientDialog.vue'

export default {
    name: 'TeamBroker',
    components: {
        BrokerClient,
        SearchIcon,
        PlusSmIcon,
        EmptyState,
        ClientDialog
    },
    mixins: [permissionsMixin, featuresMixin, clipboardMixin],
    data () {
        return {
            loading: false,
            clients: [],
            filterTerm: ''
        }
    },
    computed: {
        Roles () {
            return Roles
        },
        ...mapState('account', ['user', 'team', 'teamMembership', 'features']),
        filteredClients () {
            if (!this.filterTerm.length) return this.clients

            return this.clients.filter(client => {
                return [
                    client.username.toLowerCase().includes(this.filterTerm.toLowerCase())
                ].includes(true)
            })
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        if (!this.hasAMinimumTeamRoleOf(Roles.Member)) {
            return this.$router.push({ name: 'Home' })
        }
        this.fetchData()
    },
    methods: {
        async fetchData () {
            if (this.isMqttBrokerFeatureEnabled) {
                this.loading = true
                return await brokerApi.getClients(this.team.id)
                    .then(response => {
                        this.clients = response.clients
                    })
                    .catch(err => console.error(err))
                    .finally(() => {
                        this.loading = false
                    })
            }
        },
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
                await brokerApi.deleteClient(this.team.id, client.username)
                await this.fetchData()
                Alerts.emit('Successfully deleted Client.', 'confirmation')
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
