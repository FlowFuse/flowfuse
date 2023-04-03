<template>
    <div class="space-y-4 my-3">
        <FormRow v-model="parts.flows" type="checkbox">
            Flows
        </FormRow>
        <div :class="parts.flows?'opacity-100':'opacity-30'">
            <FormRow v-model="parts.credentials" type="checkbox" :disabled="!parts.flows">
                Credentials
            </FormRow>
        </div>
        <FormRow v-if="showTemplate" v-model="parts.template" type="checkbox">
            Template
        </FormRow>
        <FormRow v-if="showSecret" v-model="parts.credsSecret" type="text" :disabled="!parts.flows && !parts.credentials">
            Secret
            <template #description>Provide a Secret to encrypt the exported Credentials</template>
        </FormRow>
        <FormRow v-if="showSettings" v-model="parts.settings" type="checkbox">
            Application Settings
        </FormRow>
        <FormRow v-model="envVarOpts.envVars" type="checkbox">
            Environment Variables
        </FormRow>
        <div :class="['space-y-4', envVarOpts.envVars?'opacity-100':'opacity-30']">
            <ff-radio-group v-model="envVarOpts.envVarsKo" class="ml-9" orientation="vertical" :options="envVarKeyOptions" />
        </div>
    </div>
</template>

<script>
import FormRow from '../../../components/FormRow'

/**
 * flows
 * credentials
 * template
 * showSecret
 * envVars
 * envVarsKo
 */
export default {
    name: 'ExportProjectComponents',
    components: {
        FormRow
    },
    props: ['modelValue', 'showSecret', 'showTemplate', 'showSettings'],
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
    data () {
        return {
            envVarOpts: {
                envVars: true,
                envVarsKo: ''
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
    }
}
</script>
