<template>
    <ff-page v-if="featuresCheck.isJsonSchemasFeatureEnabled">
        <template #header>
            <ff-page-header title="Schemas">
                <template #context>
                    Define the shape of the data your flows send and receive. Nodes validate messages against a published version of a schema.
                </template>
                <template #tools>
                    <ff-button v-if="hasPermission('team:schema:create')" data-action="create-schema" @click="openCreate">
                        <template #icon-left><PlusIcon /></template>
                        Create schema
                    </ff-button>
                </template>
            </ff-page-header>
        </template>
        <ff-dialog
            ref="createDialog"
            header="Create schema"
            confirm-label="Create"
            :disable-primary="!name.trim()"
            :close-on-confirm="false"
            data-el="create-schema-dialog"
            @confirm="createSchema"
        >
            <FormRow v-model="name" data-form="schema-name" :error="error">Name</FormRow>
        </ff-dialog>
    </ff-page>
</template>

<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import FormRow from '@/components/FormRow.vue'
import usePermissions from '@/composables/Permissions.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'

defineOptions({ name: 'TeamSchemas' })

const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const { featuresCheck } = storeToRefs(useAccountSettingsStore())
const { team } = storeToRefs(useContextStore())
const { hasPermission } = usePermissions()

const createDialog = ref<{ show: () => void, close: () => void } | null>(null)
const name = ref('')
const error = ref('')

function openCreate () {
    name.value = ''
    error.value = ''
    createDialog.value?.show()
}

async function createSchema () {
    try {
        const schema = await schemasStore.createSchema(name.value.trim())
        createDialog.value?.close()
        router.push({ name: 'team-schema', params: { team_slug: team.value?.slug, schemaId: schema.id } })
    } catch (err) {
        error.value = err.response?.data?.error || 'Failed to create the schema.'
    }
}
</script>
