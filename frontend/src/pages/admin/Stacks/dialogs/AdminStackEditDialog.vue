<template>
    <ff-dialog ref="dialog" :header="dialogTitle" :confirm-label="stack ? 'Save' : 'Create'" :disable-primary="!formValid || loading" @confirm="confirm()">
        <template #default>
            <ff-loading v-if="loading" message="Creating Stack..." />
            <form v-else class="space-y-6" @submit.prevent>
                <div v-if="input.replaces">
                    This will create a new stack to replace '{{ input.replaces.name }}'.
                    The existing stack will be marked inactive and will not be
                    available for use by new instances.
                </div>
                <FormRow v-model="input.name" :error="errors.name" :disabled="editDisabled">
                    Name
                    <template #description>An internal name for the stack. This must be unique and can only contain a-z 0-9 - _ / @ .</template>
                </FormRow>
                <FormRow v-model="input.label" :error="errors.label">
                    Label
                    <template #description>This is how the stack is shown to users.</template>
                </FormRow>
                <FormRow v-model="input.active" type="checkbox">Active</FormRow>
                <template v-if="!editDisabled">
                    <FormRow id="projectType" v-model="input.projectType" :options="instanceTypes" :disabled="editTypeDisabled" :error="errors.projectType">
                        Instance Type
                        <template #description>
                            <div v-if="editTypeDisabled">Stacks cannot be moved to a different instance type</div>
                            <div v-else-if="stack && !stack.projectType">You can assign this stack to an instance type as a one-time action. Once assigned you cannot move it.</div>
                        </template>
                    </FormRow>
                    <template v-for="(prop) in stackProperties" :key="prop.name">
                        <FormRow v-model="input.properties[prop.name]" :error="errors[prop.name]" :disabled="editDisabled">
                            {{ prop.label }}
                            <template v-if="prop.description" #description>{{ prop.description }}</template>
                        </FormRow>
                    </template>
                </template>
                <div v-else>
                    This stack is being used by instances. Its properties cannot
                    be modified, other than to change its active state and label
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import instanceTypesApi from '../../../../api/instanceTypes.js'
import stacksApi from '../../../../api/stacks.js'

import FormRow from '../../../../components/FormRow.vue'

import Alerts from '../../../../services/alerts.js'

export default {
    name: 'AdminStackCreateDialog',
    components: {
        FormRow
    },
    emits: ['stack-created', 'stack-updated'],
    setup () {
        return {
            showCreate () {
                this.$refs.dialog.show()
                this.stack = null
                this.editDisabled = false
                this.editTypeDisabled = false
                this.input = { active: true, name: '', properties: {}, replaces: null }
                this.errors = {}
                if (this.instanceTypes.length === 0) {
                    this.errors.projectType = 'No instance types available. Ask an Administrator to create a new instance type definition'
                }
            },
            showEdit (stack) {
                this.$refs.dialog.show()
                this.stack = stack
                this.editDisabled = stack.instanceCount > 0
                this.editTypeDisabled = !!stack.projectType
                this.input = {
                    name: stack.name,
                    label: stack.label,
                    active: stack.active,
                    properties: {},
                    replaces: null,
                    projectType: stack.projectType
                }
                if (stack.properties) {
                    Object.entries(stack.properties).forEach(([key, value]) => {
                        this.input.properties[key] = value
                    })
                }
                this.errors = {}
            },
            showCreateVersion (stack) {
                this.$refs.dialog.show()
                this.stack = null
                this.editDisabled = false
                this.editTypeDisabled = true
                this.input = {
                    active: true,
                    name: stack.name + '-copy',
                    label: stack.label,
                    properties: { },
                    projectType: stack.projectType,
                    replaces: stack
                }
                if (stack.properties) {
                    Object.entries(stack.properties).forEach(([key, value]) => {
                        this.input.properties[key] = value
                    })
                }
                this.errors = {}
            }
        }
    },
    data () {
        return {
            stack: null,
            stacks: [],
            instanceTypes: [],
            loading: false,
            input: {
                name: '',
                label: '',
                active: true,
                properties: {},
                replaces: null
            },
            errors: {},
            editDisabled: false,
            editTypeDisabled: false
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        dialogTitle () {
            if (this.stack) {
                return 'Update stack'
            } else if (this.input.replaces) {
                return 'Create new stack version'
            } else {
                return 'Create stack'
            }
        },
        formValid () {
            let propError = false
            // check for validation errors:
            this.stackProperties.forEach(prop => {
                if (!this.input.properties[prop.name] || this.errors[prop.name]) {
                    propError = true
                }
            })
            return !propError && this.input.name && !this.errors.name && this.input.projectType
        },
        stackProperties () {
            return Object.entries(this.settings.stacks.properties).map(([key, value]) => {
                return {
                    name: key,
                    label: value.label,
                    description: value.description,
                    invalidMessage: value.invalidMessage || 'Invalid',
                    validator: new RegExp(value.validate)
                }
            })
        }
    },
    watch: {
        'input.properties': {
            deep: true,
            handler (v) {
                this.stackProperties.forEach(prop => {
                    if (v[prop.name] && !prop.validator.test(v[prop.name])) {
                        this.errors[prop.name] = prop.invalidMessage
                    } else {
                        this.errors[prop.name] = ''
                    }
                })
            }
        },
        'input.name': function (v) {
            if (v && !/^[a-z0-9-_/@.]+$/i.test(v)) {
                this.errors.name = 'Must only contain a-z 0-9 - _ / @ .'
            } else {
                this.errors.name = ''
            }
        }
    },
    mounted () {
        this.loadTypes()
    },
    methods: {
        async loadTypes () {
            const result = await instanceTypesApi.getInstanceTypes(null, 100, 'all')
            this.instanceTypes = result.types.map(pt => {
                if (!pt.active) {
                    pt.label = pt.label + ' (inactive)'
                }
                return pt
            })
            this.instanceTypes.sort(function (A, B) {
                if (A.active !== B.active) {
                    return A.active ? -1 : 1
                } else if (A.order !== B.order) {
                    return A.order - B.order
                } else {
                    return A.name.localeCompare(B.name)
                }
            })
        },
        confirm () {
            if (this.formValid || !this.loading) {
                this.loading = true
                let opts = {
                    name: this.input.name,
                    label: this.input.label,
                    active: this.input.active,
                    projectType: this.input.projectType,
                    properties: {}
                }
                if (this.input.replaces) {
                    opts.replace = this.input.replaces.id
                }
                this.stackProperties.forEach(prop => {
                    opts.properties[prop.name] = this.input.properties[prop.name]
                })

                if (this.stack) {
                    if (this.editDisabled) {
                        opts = {
                            active: this.input.active,
                            label: this.input.label
                        }
                        if (!this.editTypeDisabled && this.input.projectType) {
                            opts.projectType = this.input.projectType
                        }
                    }
                    // Update
                    stacksApi.updateStack(this.stack.id, opts).then((response) => {
                        this.$emit('stack-updated', response)
                    }).catch(err => {
                        console.error(err.response.data)
                        if (err.response.data) {
                            if (/name/.test(err.response.data.error)) {
                                this.errors.name = 'Name unavailable'
                            }
                            Alerts.emit(err.response.data.error, 'warning')
                        }
                    }).finally(() => {
                        this.loading = false
                    })
                } else {
                    stacksApi.create(opts).then((response) => {
                        if (this.input.replaces) {
                            this.input.replaces.active = false
                            this.input.replaces.replacedBy = response.id
                        }
                        this.$emit('stack-created', response, this.input.replaces)
                    }).catch(err => {
                        console.error(err.response.data)
                        if (err.response.data) {
                            if (/name/.test(err.response.data.error)) {
                                this.errors.name = 'Name unavailable'
                            }
                            Alerts.emit(err.response.data.error, 'warning')
                        }
                    }).finally(() => {
                        this.loading = false
                    })
                }
            }
        }
    }
}
</script>
