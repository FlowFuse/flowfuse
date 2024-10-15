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
            <ff-loading v-if="loading" message="Loading Clients..."/>
            <template v-else>
                <ff-data-table
                    v-if="clients.length > 0"
                    data-el="clients-table" :columns="columns" :rows="clients" :show-search="true" search-placeholder="Search Clients..." :search-fields="['username']"
                >
                    <template #actions>
                        <ff-button
                            v-if="hasPermission('project:create')"
                            data-action="create-client"
                            kind="primary"
                        >
                            <template #icon-left>
                                <PlusSmIcon />
                            </template>
                            Create Client
                        </ff-button>
                    </template>
                    <template #context-menu="{row}">
                        <ff-list-item label="edit" data-action="edit-client" @click="editClient(row)" />
                        <ff-list-item label="delete" kind="danger" data-action="delete-client" @click="removeClient(row)" />
                    </template>
                </ff-data-table>
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
    </ff-page>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import brokerApi from '../../../api/broker.js'
import EmptyState from '../../../components/EmptyState.vue'
import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'TeamBroker',
    components: {
        PlusSmIcon,
        EmptyState
    },
    mixins: [permissionsMixin],
    data () {
        return {
            loading: false,
            clients: [],
            columns: [
                { label: 'Username', class: ['flex-grow'], key: 'username', sortable: true },
                { label: 'ACLS', class: ['w-44'], key: 'acls', sortable: false }
            ]
        }
    },
    computed: {

    },
    watch : {
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
            console.log(row)
            await brokerApi.deleteClient(this.team.id, row.username)
            this.fetchData()
        },
        async editClient (row) {
            
        }
    }
}

</script>