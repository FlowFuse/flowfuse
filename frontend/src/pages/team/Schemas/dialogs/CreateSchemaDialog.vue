<template>
    <ff-dialog
        ref="dialog"
        header="Create schema"
        confirm-label="Create"
        :disable-primary="!name.trim() || creating"
        :close-on-confirm="false"
        data-el="create-schema-dialog"
        @confirm="create"
    >
        <FormRow v-model="name" data-form="schema-name" :error="error">Name</FormRow>
    </ff-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import FormRow from '@/components/FormRow.vue'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'

defineOptions({ name: 'CreateSchemaDialog' })

const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const { team } = storeToRefs(useContextStore())

const dialog = ref<{ show: () => void, close: () => void } | null>(null)
const name = ref('')
const error = ref('')
const creating = ref(false)

function show () {
    name.value = ''
    error.value = ''
    dialog.value?.show()
}

async function create () {
    if (creating.value) return
    creating.value = true
    try {
        const schema = await schemasStore.createSchema(name.value.trim())
        dialog.value?.close()
        router.push({ name: 'team-schema', params: { team_slug: team.value?.slug, schemaId: schema.id } })
    } catch (err) {
        error.value = err.response?.data?.error || 'Failed to create the schema.'
    } finally {
        creating.value = false
    }
}

defineExpose({ show })
</script>
