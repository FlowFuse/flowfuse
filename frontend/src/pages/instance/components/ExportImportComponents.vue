<template>
    <div class="space-y-4">
        <p v-if="header" class="text-gray-800 block text-sm font-medium">
            {{ header }}
        </p>
        <FormRow v-model="parts.flows" type="checkbox" data-form="component-flows">
            Flows
        </FormRow>
        <div v-if="showCredentials" :class="parts.flows?'opacity-100':'opacity-30'">
            <FormRow v-model="parts.credentials" type="checkbox" :disabled="!parts.flows" data-form="component-credentials">
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
            Instance Settings
        </FormRow>
        <FormRow v-model="envVarOpts.envVars" type="checkbox" data-form="component-environment-variables">
            Environment Variables
        </FormRow>
        <div :class="['space-y-4', envVarOpts.envVars?'opacity-100':'opacity-30']" data-form="component-environment-variables-options">
            <ff-radio-group v-model="envVarOpts.envVarsKo" class="ml-9" orientation="vertical" :options="envVarOptions" />
        </div>
        <div v-if="error" data-el="form-row-error" class="text-red-400 inline text-xs">{{ error }}</div>
    </div>
</template>

<script>
import FormRow from '../../../components/FormRow.vue'

/**
 * flows
 * credentials
 * template
 * showSecret
 * envVars
 * envVarsKo
 */
export default {
    name: 'ExportImportComponents',
    components: {
        FormRow
    },
    props: {
        modelValue: {
            type: Object,
            required: true
        },
        showSecret: {
            type: Boolean,
            default: false
        },
        showTemplate: {
            type: Boolean,
            default: false
        },
        showCredentials: {
            type: Boolean,
            default: true
        },
        showSettings: {
            type: Boolean,
            default: false
        },
        header: {
            type: String,
            default: ''
        },
        error: {
            type: String,
            default: ''
        }
    },
    emits: ['update:modelValue'],
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
        },
        envVarOptions: {
            get () {
                const opts = this.envVarKeyOptions.map(opt => {
                    return {
                        ...opt,
                        disabled: this.parts.envVars === false
                    }
                })
                return opts
            },
            set (localValue) {
                this.envVarOpts = localValue
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
        },
        'parts.envVars': {
            handler: function (value) {
                this.syncEnvVars()
            }
        }
    },
    mounted () {
        this.syncEnvVars()
    },
    methods: {
        syncEnvVars () {
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
}
</script>
