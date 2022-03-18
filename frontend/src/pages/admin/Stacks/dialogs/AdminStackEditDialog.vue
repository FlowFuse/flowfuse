<template>
    <TransitionRoot appear :show="isOpen" as="template">
        <Dialog as="div" @close="close">
            <div class="fixed inset-0 z-10 overflow-y-auto">
                <div class="min-h-screen px-4 text-center">
                    <DialogOverlay class="fixed inset-0 bg-black opacity-50" />
                    <span class="inline-block h-screen align-middle" aria-hidden="true">
                        &#8203;
                    </span>
                    <TransitionChild
                        as="template"
                        enter="duration-300 ease-out"
                        enter-from="opacity-0 scale-95"
                        enter-to="opacity-100 scale-100"
                        leave="duration-200 ease-in"
                        leave-from="opacity-100 scale-100"
                        leave-to="opacity-0 scale-95"
                    >
                        <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-lg rounded">
                            <DialogTitle as="h3" class="text-lg font-medium leading-6"><span v-if="stack">Update</span><span v-else>Create</span> stack</DialogTitle>
                            <form class="space-y-6 mt-2">
                                <FormRow v-model="input.name" :error="errors.name" :disabled="editDisabled">Name</FormRow>
                                <FormRow v-model="input.active" type="checkbox">Active</FormRow>
                                <template v-for="(prop) in stackProperties" :key="prop.name">
                                    <FormRow v-model="input.properties[prop.name]" :error="errors[prop.name]" :disabled="editDisabled">{{prop.label}}</FormRow>
                                </template>
                                <div class="mt-4 flex flex-row justify-end">
                                    <button type="button" class="forge-button-secondary ml-4" @click="close">Cancel</button>
                                    <button type="button" :disabled="!formValid" class="forge-button ml-4" @click="confirm"><span v-if="stack">Update</span><span v-else>Create</span></button>
                                </div>
                            </form>
                        </div>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script>
import stacksApi from '@/api/stacks'

import { ref } from 'vue'
import {
    TransitionRoot,
    TransitionChild,
    Dialog,
    DialogOverlay,
    DialogTitle
} from '@headlessui/vue'

import FormRow from '@/components/FormRow'
import { mapState } from 'vuex'

export default {
    name: 'AdminStackCreateDialog',

    components: {
        TransitionRoot,
        TransitionChild,
        Dialog,
        DialogOverlay,
        DialogTitle,
        FormRow
    },
    data () {
        return {
            input: {
                name: '',
                active: true,
                properties: {}
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
        }
    },
    computed: {
        formValid () {
            return (this.input.name)
        },
        ...mapState('account', ['settings']),
        stackProperties () {
            return Object.entries(this.settings.stacks.properties).map(([key, value]) => {
                return {
                    name: key,
                    label: value.label,
                    invalidMessage: value.invalidMessage || 'Invalid',
                    validator: new RegExp(value.validate)
                }
            })
        }
    },
    methods: {
        confirm () {
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
