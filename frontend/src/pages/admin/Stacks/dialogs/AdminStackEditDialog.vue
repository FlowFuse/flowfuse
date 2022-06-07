<template>
    <ff-dialog :open="isOpen" :header="(stack ? 'Update' : 'Create') + ' Stack'" @confirm="isOpen = false">
        <template v-slot:default>
            <ff-loading v-if="loading" message="Creating Stack..."/>
            <form v-else class="space-y-6">
                <FormRow v-if="!stack" :options="options" v-model="input.baseStack">
                    Optionally, use an existing Stack as a starting point:
                </FormRow>
                <hr v-if="!stack" />
                <FormRow v-model="input.name" :error="errors.name" :disabled="editDisabled">Name</FormRow>
                <FormRow v-model="input.active" type="checkbox">Active</FormRow>
                <template v-for="(prop) in stackProperties" :key="prop.name">
                    <FormRow v-model="input.properties[prop.name]" :error="errors[prop.name]" :disabled="editDisabled">
                        {{prop.label}}
                        <template v-if="prop.description" #description>{{prop.description}}</template>
                    </FormRow>
                </template>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="primary" @click="confirm()" :disabled="!formValid || loading">{{ (stack ? 'Save' : 'Create') }}</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import stacksApi from '@/api/stacks'

import { ref } from 'vue'

import FormRow from '@/components/FormRow'
import { mapState } from 'vuex'

export default {
    name: 'AdminStackCreateDialog',
    components: {
        FormRow
    },
    emits: ['stackCreated', 'stackUpdated'],
    data () {
        return {
            stack: null,
            stacks: [],
            options: [],
            loading: false,
            input: {
                name: '',
                active: true,
                properties: {},
                baseStack: null
            },
            errors: {},
            editDisabled: false
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
        },
        'input.baseStack': function (v) {
            if (v) {
                let baseStack = null
                for (const s in this.stacks) {
                    const stack = this.stacks[s]
                    if (stack.id === v) {
                        baseStack = stack
                        break
                    }
                }
                this.input.baseStack = null
                // loop through and assign explicitely to prevent two-way binding
                for (const prop in baseStack.properties) {
                    this.input.properties[prop] = baseStack.properties[prop]
                }
            }
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        formValid () {
            let propError = false
            // check for validation errors:
            this.stackProperties.forEach(prop => {
                if (!this.input.properties[prop.name] || this.errors[prop.name]) {
                    propError = true
                }
            })
            return !propError && this.input.name && !this.errors.name
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
    mounted () {
        if (!this.stack) {
            // we are creating a stack, not editing one
            stacksApi.getStacks().then((data) => {
                this.stacks = data.stacks
                this.options = data.stacks.map((stack) => {
                    return {
                        value: stack.id,
                        label: stack.name
                    }
                })
            })
        }
    },
    methods: {
        confirm () {
            this.loading = true
            const opts = {
                name: this.input.name,
                active: this.input.active,
                properties: {}
            }
            this.stackProperties.forEach(prop => {
                opts.properties[prop.name] = this.input.properties[prop.name]
            })

            if (this.stack) {
                // Update
                stacksApi.updateStack(this.stack.id, opts).then((response) => {
                    this.isOpen = false
                    this.$emit('stackUpdated', response)
                }).catch(err => {
                    console.log(err.response.data)
                    if (err.response.data) {
                        if (/name/.test(err.response.data.error)) {
                            this.errors.name = 'Name unavailable'
                        }
                    }
                }).finally(() => {
                    this.loading = false
                })
            } else {
                stacksApi.create(opts).then((response) => {
                    this.isOpen = false
                    this.$emit('stackCreated', response)
                }).catch(err => {
                    console.log(err.response.data)
                    if (err.response.data) {
                        if (/name/.test(err.response.data.error)) {
                            this.errors.name = 'Name unavailable'
                        }
                    }
                }).finally(() => {
                    this.loading = false
                })
            }
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show (stack) {
                this.stack = stack
                if (stack) {
                    this.editDisabled = stack.projectCount > 0
                    this.input = {
                        name: stack.name,
                        active: stack.active,
                        properties: stack.properties
                    }
                } else {
                    this.editDisabled = false
                    this.input = { active: true, name: '', properties: {} }
                }
                this.errors = {}
                isOpen.value = true
            }
        }
    }
}
</script>
