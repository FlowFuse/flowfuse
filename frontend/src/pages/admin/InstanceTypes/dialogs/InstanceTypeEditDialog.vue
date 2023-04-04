<template>
    <ff-dialog ref="dialog" :header="dialogTitle">
        <template v-slot:default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <FormRow v-model="input.name" :error="errors.name" data-form="name">Name</FormRow>
                <FormRow v-model="input.active" type="checkbox" data-form="active">Active</FormRow>
                <FormRow v-model="input.description" :error="errors.description" data-form="description">Description
                    <template #description>Use markdown for formatting</template>
                    <template #input><textarea class="w-full" rows="6" v-model="input.description"></textarea></template>
                </FormRow>
                <FormRow :options="stacks" v-model="input.defaultStack" :disabled="stacks.length === 0" id="stack" data-form="stack">
                    Default Stack
                    <template #description><div v-if="stacks.length === 0">There are no stacks defined for this Instance Type yet.</div></template>
                </FormRow>
                <template v-if="this.features.billing">
                    <FormHeading>Billing</FormHeading>
                    <FormRow v-model="input.properties.billingProductId" :type="editDisabled?'uneditable':''">
                        Stripe Product Id
                    </FormRow>
                    <FormRow v-model="input.properties.billingPriceId" :type="editDisabled?'uneditable':''">
                        Stripe Price Id
                    </FormRow>
                    <FormRow v-model="input.properties.billingDescription" :type="editDisabled?'uneditable':''">
                        Pricing description
                        <template #description>
                            How should the pricing be displayed to the user? eg '$10/month'
                        </template>
                    </FormRow>
                </template>
                <FormRow v-model="input.order">Order
                    <template #description>Set the sort order when listing the types</template>
                </FormRow>
            </form>
        </template>
        <template v-slot:actions>
            <div class="w-full grow flex justify-between">
                <div>
                    <ff-button v-if="instanceType" kind="danger" style="margin: 0;" @click="$emit('showDeleteDialog', instanceType); $refs.dialog.close()">Delete Instance Type</ff-button>
                </div>
                <div class="flex">
                    <ff-button kind="secondary" @click="$refs['dialog'].close()">Cancel</ff-button>
                    <ff-button @click="confirm(); $refs.dialog.close()" :disabled="!formValid">{{ instanceType ? 'Update' : 'Create' }}</ff-button>
                </div>
            </div>
        </template>
    </ff-dialog>
</template>

<script>
import instanceTypesApi from '../../../../api/instanceTypes.js'
import stacksApi from '../../../../api/stacks.js'

import FormRow from '../../../../components/FormRow.vue'
import FormHeading from '../../../../components/FormHeading.vue'

import { mapState } from 'vuex'

export default {
    name: 'AdminInstanceTypeCreateDialog',
    emits: ['instanceTypeUpdated', 'instanceTypeCreated', 'showDeleteDialog'],
    components: {
        FormRow,
        FormHeading
    },
    data () {
        return {
            instanceType: null,
            stacks: [],
            input: {
                name: '',
                active: true,
                description: '',
                properties: {},
                defaultStack: ''
            },
            errors: {},
            editDisabled: false
        }
    },
    computed: {
        ...mapState('account', ['features']),
        formValid () {
            return (this.input.name)
        },
        dialogTitle () {
            if (this.instanceType) {
                return 'Edit instance type'
            } else {
                return 'Create instance type'
            }
        }
    },
    methods: {
        confirm () {
            if (this.formValid) {
                const opts = {
                    name: this.input.name,
                    active: this.input.active,
                    description: this.input.description,
                    order: parseInt(this.input.order),
                    defaultStack: this.input.defaultStack,
                    properties: {}
                }
                if (this.features.billing) {
                    opts.properties.billingProductId = this.input.properties.billingProductId
                    opts.properties.billingPriceId = this.input.properties.billingPriceId
                    opts.properties.billingDescription = this.input.properties.billingDescription
                }

                if (this.instanceType) {
                    // For edits, we cannot touch the properties
                    delete opts.properties
                    // Update
                    instanceTypesApi.updateInstanceType(this.instanceType.id, opts).then((response) => {
                        this.$emit('instanceTypeUpdated', response)
                    }).catch(err => {
                        console.error(err.response.data)
                        if (err.response.data) {
                            if (/name/.test(err.response.data.error)) {
                                this.errors.name = 'Name unavailable'
                            }
                        }
                    })
                } else {
                    instanceTypesApi.create(opts).then((response) => {
                        this.$emit('instanceTypeCreated', response)
                    }).catch(err => {
                        console.error(err.response.data)
                        if (err.response.data) {
                            if (/name/.test(err.response.data.error)) {
                                this.errors.name = 'Name unavailable'
                            }
                        }
                    })
                }
            }
        }
    },
    setup () {
        return {
            show (instanceType) {
                this.$refs.dialog.show()
                this.instanceType = instanceType
                this.stacks = []
                if (instanceType) {
                    this.editDisabled = instanceType.projectCount > 0
                    this.input = {
                        name: instanceType.name,
                        active: instanceType.active,
                        properties: instanceType.properties,
                        description: instanceType.description,
                        // Cast to string so the v-model into FormRow works
                        // Normally you'd use v-model.number to handle this
                        // but we don't have that inside FormRow currently and
                        // this is good enough for now
                        order: '' + instanceType.order
                    }
                    stacksApi.getStacks(null, null, null, instanceType.id).then(stackList => {
                        this.stacks = stackList.stacks.filter(stack => stack.active).map(stack => { return { value: stack.id, label: stack.name } })
                        this.input.defaultStack = instanceType.defaultStack
                    })
                } else {
                    this.editDisabled = false
                    this.input = { active: true, name: '', properties: {}, description: '', order: '1' }
                }
                this.errors = {}
            }
        }
    }
}
</script>
