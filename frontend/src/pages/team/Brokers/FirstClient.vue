<template>
    <EmptyState>
        <template #img>
            <img src="../../../images/empty-states/mqtt-empty.png" alt="logo">
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
                <ff-button
                    data-action="back"
                    kind="tertiary"
                    @click="$router.back()"
                >
                    Cancel
                </ff-button>
            </section>
        </template>
    </EmptyState>

    <ClientDialog ref="clientDialog" />
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'

import EmptyState from '../../../components/EmptyState.vue'
import usePermissions from '../../../composables/Permissions.js'

import ClientDialog from './Clients/dialogs/ClientDialog.vue'

export default {
    name: 'FirstClient',
    components: {
        EmptyState,
        PlusSmIcon,
        ClientDialog
    },
    setup () {
        const { hasPermission } = usePermissions()

        return {
            hasPermission
        }
    },
    methods: {
        async createClient () {
            this.$refs.clientDialog.showCreate()
        }
    }
}
</script>

<style scoped lang="scss">

</style>
