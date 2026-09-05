<template>
    <div class="unified-namespace-clients">
        <feature-unavailable-to-team v-if="reachedClientLimit" class="-mt-2">
            <div>
                {{ $t('ui.youVeHitYourCurrentBrokerClientsLimit') }}
                <router-link class="ff-link" :to="{ name: 'team-change-type', params: { team_slug: team.slug } }">{{ $t('ui.upgrade') }}</router-link>
                {{ $t('ui.yourTeamForMoreCapacityOrGetInTouchWithSalesForA') }}
            </div>
        </feature-unavailable-to-team>
        <div class="title mb-5 flex gap-3 items-center">
            <RssIcon class="ff-icon-sm" />
            <h3 class="my-2" data-el="subtitle">{{ $t('ui.mqttBroker') }}</h3>
        </div>

        <div class="space-y-6">
            <ff-loading v-if="loading" :message="$t('ui.loadingClients')" />
            <template v-else>
                <section v-if="clients.length > 0">
                    <div class="header ff-data-table--options">
                        <ff-text-input
                            v-model="filterTerm"
                            class="ff-data-table--search"
                            data-form="search"
                            :placeholder="$t('ui.searchClients')"
                        >
                            <template #icon><MagnifyingGlassIcon /></template>
                        </ff-text-input>
                        <ff-button
                            v-if="hasPermission('broker:clients:create')"
                            data-action="create-client"
                            kind="primary"
                            :disabled="reachedClientLimit"
                            @click="createClient()"
                        >
                            <template #icon-left>
                                <PlusSmallIcon />
                            </template>
                            {{ $t('ui.createClient') }}
                        </ff-button>
                    </div>
                    <div class="clients-wrapper">
                        <div class="header grid grid-cols-6 gap-4 font-bold">
                            <span class="username">{{ $t('ui.usernameClientid') }}</span>
                            <span class="rules">{{ $t('ui.rules') }}</span>
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
                                {{ $t('ui.noClientsFoundByThatName') }}
                            </li>
                        </ul>
                    </div>
                </section>
                <EmptyState v-else>
                    <template #img>
                        <img src="../../../../images/empty-states/mqtt-empty.png" alt="logo">
                    </template>
                    <template #header>{{ $t('ui.createYourFirstBrokerClient') }}</template>
                    <template #message>
                        <p>{{ $t('ui.itLooksLikeYouHavenTCreatedAnyMqttClients') }}</p>
                        <p>{{ $t('ui.getStartedByAddingYourFirstClientToManageTopicPe') }}</p>
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
                                    <PlusSmallIcon />
                                </template>
                                {{ $t('ui.createClient') }}
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
import { MagnifyingGlassIcon, PlusSmallIcon, RssIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'

import brokerApi from '../../../../api/broker.js'
import EmptyState from '../../../../components/EmptyState.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'
import usePermissions from '../../../../composables/Permissions.js'
import { getTeamProperty } from '../../../../composables/TeamProperties.js'
import { slugify } from '../../../../composables/strings/String.js'
import { t } from '../../../../i18n.js'
import clipboardMixin from '../../../../mixins/Clipboard.js'
import Alerts from '../../../../services/alerts.js'
import Dialog from '../../../../services/dialog.js'
import { Roles } from '../../../../utils/roles.js'

import BrokerClient from './components/BrokerClient.vue'

import ClientDialog from './dialogs/ClientDialog.vue'

import { useContextStore } from '@/stores/context.js'
import { useProductBrokersStore } from '@/stores/product-brokers.js'

export default {
    name: 'BrokerClients',
    components: {
        FeatureUnavailableToTeam,
        BrokerClient,
        MagnifyingGlassIcon,
        PlusSmallIcon,
        RssIcon,
        EmptyState,
        ClientDialog
    },
    mixins: [clipboardMixin],
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
        ...mapState(useContextStore, ['team']),
        ...mapState(useProductBrokersStore, {
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
            return getTeamProperty(this.team, 'teamBroker.clients.limit', null)
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
        ...mapActions(useProductBrokersStore, ['fetchUnsClients', 'removeFfBroker']),
        async createClient () {
            this.$refs.clientDialog.showCreate()
        },
        async onEditClient (client) {
            this.$refs.clientDialog.showEdit(client)
        },
        async onDeleteClient (client) {
            await Dialog.show({
                header: t('ui.deleteClient'),
                text: t('ui.areYouSureYouWantToDeleteThisClient'),
                kind: 'danger',
                confirmLabel: 'Delete'
            }, async () => {
                brokerApi.deleteClient(this.team.id, client.username)
                    .then(() => this.fetchUnsClients())
                    .then(() => Alerts.emit('Successfully deleted Client.', 'confirmation'))
                    .then(async () => {
                        if (this.clients.length === 0) {
                            this.removeFfBroker()
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
        border: 1px solid var(--ff-color-border-strong);
        border-radius: 5px;
        overflow: hidden;

        .header {
            background: var(--ff-color-bg-surface-raised);
            padding: 10px;
            border-bottom: 1px solid var(--ff-color-border-strong);

            span {
                &.username {
                    grid-column: span 2;
                }
            }
        }

        .clients-list {
            background: var(--ff-color-bg-app);

            .client {
                border-bottom: 1px solid var(--ff-color-border-strong);

                &:last-of-type {
                    border-bottom: none;
                }
            }
        }
    }
</style>
