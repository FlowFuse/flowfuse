<template>
    <div>
        <FormRow type="checkbox" v-model="parts.flows">
            Flows
            <template #description>Export Project Flows</template>
        </FormRow>
        <div v-if="parts.flows">
            <FormRow type="checkbox" v-model="parts.creds">
                Credentials
                <template #description>Export Flow Credentials</template>
            </FormRow>
            <FormRow type="text" v-model="parts.credsSecret" v-bind:disabled="!parts.creds">
                Secret
                <template #description>Provide a Secret to encrypt the exported Credentials</template>
            </FormRow>
        </div>
        <!-- <FormRow type="checkbox" v-model="parts.nodes">Installed Nodes</FormRow> -->
        <FormRow type="checkbox" v-model="parts.envVars">
            Environment Variables
            <template #description>Export Environment Variables</template>
        </FormRow>
        <FormRow v-if="parts.envVars" type="radio" v-model="parts.envVarsKo" :value="false">
            Keys and Values
            <!-- <template v-slot:description>Keys and Values</template> -->
        </FormRow>
        <FormRow v-if="parts.envVars" type="radio" v-model="parts.envVarsKo" :value="true">
            Keys only
            <!-- <template v-slot:description>Keys only</template> -->
        </FormRow>
        <!-- <FormRow type="checkbox" v-model="parts.settings">Settings</FormRow> -->
    </div>
</template>

<script>
import FormRow from '@/components/FormRow'

export default {
    name: 'ExportProjectComponets',
    props: ['modelValue'],
    computed: {
        parts: {
            get () {
                return this.modelValue
            },
            set (localValue) {
                this.$emit('update:modelValue', localValue)
            }
        }
    },
    components: {
        FormRow
    }
}
</script>
