<template>
    <ff-page v-if="featuresCheck.isJsonSchemasFeatureEnabled">
        <template #header>
            <ff-page-header title="Schemas">
                <template #context>
                    Define the shape of the data your flows send and receive. Nodes validate messages against a published version of a schema.
                </template>
            </ff-page-header>
        </template>
    </ff-page>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

defineOptions({ name: 'TeamSchemas' })

const { featuresCheck } = storeToRefs(useAccountSettingsStore())
</script>
