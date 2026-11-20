<template>
    <ff-page v-if="featuresCheck.isJsonSchemasFeatureEnabled">
        <template #header>
            <ff-page-header title="Schemas">
                <template #context>
                    Define the shape of the data your flows send and receive. Nodes validate messages against a published version of a schema.
                </template>
                <template #tools>
                    <ff-button v-if="hasPermission('team:schema:create')" data-action="create-schema" @click="createDialog?.show()">
                        <template #icon-left><PlusIcon /></template>
                        Create schema
                    </ff-button>
                </template>
            </ff-page-header>
        </template>
        <CreateSchemaDialog ref="createDialog" />
    </ff-page>
</template>

<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

import CreateSchemaDialog from './dialogs/CreateSchemaDialog.vue'

import usePermissions from '@/composables/Permissions.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'

defineOptions({ name: 'TeamSchemas' })

const { featuresCheck } = storeToRefs(useAccountSettingsStore())
const { hasPermission } = usePermissions()

const createDialog = ref<InstanceType<typeof CreateSchemaDialog> | null>(null)
</script>
