<template>
    <EmptyState>
        <template #img>
            <img src="../../../images/empty-states/mqtt-empty.png" alt="logo">
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
                <ff-button
                    data-action="back"
                    kind="tertiary"
                    @click="$router.back()"
                >
                    {{ $t('ui.cancel') }}
                </ff-button>
            </section>
        </template>
    </EmptyState>

    <ClientDialog ref="clientDialog" />
</template>

<script>
import { PlusSmallIcon } from '@heroicons/vue/24/outline'

import EmptyState from '../../../components/EmptyState.vue'
import usePermissions from '../../../composables/Permissions.js'

import ClientDialog from './Clients/dialogs/ClientDialog.vue'

export default {
    name: 'FirstClient',
    components: {
        EmptyState,
        PlusSmallIcon,
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
