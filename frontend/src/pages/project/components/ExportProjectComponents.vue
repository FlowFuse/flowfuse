<template>
    <div class="space-y-4 my-3">
        <FormRow type="checkbox" v-model="parts.flows">
            Flows
        </FormRow>
        <div :class="parts.flows?'opacity-100':'opacity-30'">
            <FormRow type="checkbox" v-bind:disabled="!parts.flows" v-model="parts.credentials">
                Credentials
            </FormRow>
        </div>
        <FormRow type="checkbox" v-if="showTemplate" v-model="parts.template">
            Template
        </FormRow>
        <FormRow v-if="showSecret" type="text" v-model="parts.credsSecret" v-bind:disabled="!parts.flows && !parts.credentials">
            Secret
            <template #description>Provide a Secret to encrypt the exported Credentials</template>
        </FormRow>
        <FormRow v-if="showSettings" type="checkbox" v-model="parts.settings">
            Project Settings
        </FormRow>
        <FormRow type="checkbox" v-model="envVarOpts.envVars">
            Environment Variables
        </FormRow>
        <div :class="['space-y-4', envVarOpts.envVars?'opacity-100':'opacity-30']">
            <ff-radio-group class="ml-9" v-model="envVarOpts.envVarsKo" orientation="vertical" :options="envVarKeyOptions"></ff-radio-group>
        </div>
    </div>
</template>

<script>
import FormRow from '@/components/FormRow'
/**
 * flows
 * credentials
 * template
 * showSecret
 * envVars
 * envVarsKo
 */
export default {
    name: 'ExportProjectComponets',
    props: ['modelValue', 'showSecret', 'showTemplate', 'showSettings'],
    data () {
        return {
            envVarOpts: {
                envVars: true,
                envVarsKo: false
            }
        }
    },
    mounted () {
        if (this.parts.envVars === false) {
            this.envVarOpts.envVars = false
        } else if (this.parts.envVars === true || this.parts.envVars === 'all') {
            this.envVarOpts.envVars = true
            this.envVarOpts.envVarsKo = 'all'
        } else {
            this.envVarOpts.envVars = true
            this.envVarOpts.envVarsKo = 'keys'
        }
    },
    setup () {
        return {
            envVarKeyOptions: [{
                label: 'Keys and Values',
                value: 'all'
            }, {
                label: 'Keys Only',
                value: 'keys'
            }]
        }
    },
    watch: {
        envVarOpts: {
            deep: true,
            handler: function (value) {
                if (!value.envVars) {
                    this.parts.envVars = false
                } else {
                    this.parts.envVars = value.envVarsKo
                }
            }
        }
    },
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
