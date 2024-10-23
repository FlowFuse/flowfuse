<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Broker">
                <template #context>
                    Manage Access to the MQTT Broker
                </template>
            </ff-page-header>
        </template>
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
                            <span class="username">Username</span>
                            <span class="rules">Rules</span>
                        </div>
                        <ul data-el="clients-list" class="clients-list">
                            <li v-for="client in filteredClients" :key="client.id" class="client">
                                <ff-accordion class="max-w-full w-full">
                                    <template #label>
                                        <div class="username text-left">
                                            {{ client.username }}
                                        </div>
                                        <div class="rules text-left">
                                            <span>{{ client.acls.length }} Rule{{ client.acls.length > 1 ? 's' : '' }}</span>
                                        </div>
                                    </template>
                                    <template #meta>
                                        <PencilIcon
                                            v-if="hasAMinimumTeamRoleOf(Roles.Owner)"
                                            class="ff-icon-sm hover:cursor-pointer edit"
                                            @click.prevent.stop="editClient"
                                        />
                                        <TrashIcon
                                            v-if="hasAMinimumTeamRoleOf(Roles.Owner)"
                                            class="ff-icon-sm hover:cursor-pointer delete"
                                            @click.prevent.stop="deleteClient"
                                        />
                                    </template>
                                    <template #content>
                                        <ul class="acl-list">
                                            <li v-for="(acl, $key) in client.acls" :key="$key" class="acl grid grid-cols-6 gap-4">
                                                <div class="action col-start-2 flex gap-2.5">
                                                    <span
                                                        :class="{
                                                            'text-green-500': ['publish', 'both'].includes(acl.action),
                                                            'text-red-500': ['subscribe'].includes(acl.action)
                                                        } "
                                                    >
                                                        <CheckIcon v-if="['publish', 'both'].includes(acl.action)" class="ff-icon-sm" />
                                                        <XIcon v-else class="ff-icon-sm" />
                                                        pub
                                                    </span>
                                                    <span
                                                        :class="{
                                                            'text-green-500': ['subscribe', 'both'].includes(acl.action),
                                                            'text-red-500': ['publish'].includes(acl.action)
                                                        } "
                                                    >
                                                        <CheckIcon v-if="['subscribe', 'both'].includes(acl.action)" class="ff-icon-sm" />
                                                        <XIcon v-else class="ff-icon-sm" />
                                                        sub
                                                    </span>
                                                </div>
                                                <div class="pattern">
                                                    {{ acl.pattern }}
                                                </div>
                                            </li>
                                        </ul>
                                    </template>
                                </ff-accordion>
                            </li>
                            <li v-if="!filteredClients.length" class="text-center p-5">
                                No clients found by that name.
                            </li>
                        </ul>
                    </div>
                </section>
                <EmptyState v-else>
                    <template #header>Create first Broker Client</template>
                    <template #message>
                        <p>HelloWorld</p>
                    </template>
                    <template #actions>
                        <ff-button
                            v-if="hasPermission('project:create')"
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
        <ClientDialog ref="clientDialog" :clients="clients" :team="team" @client-created="fetchData" />
    </ff-page>
</template>

<script>
import { CheckIcon, PencilIcon, PlusSmIcon, SearchIcon, TrashIcon, XIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import brokerApi from '../../../api/broker.js'
import FfAccordion from '../../../components/Accordion.vue'
import EmptyState from '../../../components/EmptyState.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import { Roles } from '../../../utils/roles.js'

import ClientDialog from './dialogs/ClientDialog.vue'

export default {
    name: 'TeamBroker',
    components: {
        FfAccordion,
        SearchIcon,
        PlusSmIcon,
        PencilIcon,
        TrashIcon,
        CheckIcon,
        XIcon,
        EmptyState,
        ClientDialog
    },
    mixins: [permissionsMixin],
    data () {
        return {
            loading: false,
            clients: [],
            filterTerm: '',
            columns: [
                { label: 'Username', class: ['flex-grow'], key: 'username', sortable: true },
                { label: 'ACLS', class: ['w-44'], key: 'acls', sortable: false }
            ]
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
        this.fetchData()
    },
    methods: {
        fetchData: async function () {
            this.loading = true
            this.clients = (await brokerApi.getClients(this.team.id)).clients
            this.loading = false
        },
        async removeClient (row) {
            await brokerApi.deleteClient(this.team.id, row.username)
            this.fetchData()
        },
        async createClient () {
            this.$refs.clientDialog.showCreate()
        },
        async editClient (row) {
            console.log('editing')
        },
        async deleteClient () {
            console.log('deleting')
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

               .ff-accordion {
                   margin-bottom: 0;

                   button {
                       border: none;
                       background: none;
                       display: grid;
                       grid-template-columns: repeat(6, 1fr);
                       gap: 15px;
                       padding: 0;

                       .username {
                           padding: 15px 10px;
                           grid-column: span 2;
                       }

                       .rules {
                           padding: 15px 10px;

                       }

                       .toggle {
                           grid-column: span 3;
                           text-align: right;
                           padding-right: 10px;

                           .edit, .delete {
                               margin-left: 15px
                           }
                       }
                   }

                   .ff-accordion--content {
                       background: $ff-grey-100;
                       .acl-list {
                           .acl {
                               border-bottom: 1px solid $ff-grey-200;
                               padding: 15px 10px;
                               gap: 10px;
                               font-size: 80%;

                               &:last-of-type {
                                   border: none;
                               }
                           }
                       }
                   }
               }
            }
        }
    }
</style>
