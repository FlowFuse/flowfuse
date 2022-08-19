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
                    <template #description><div v-if="stacks.length === 0">There no stacks defined for this Project Type yet.</div></template>
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
                    <ff-button v-if="projectType" kind="danger" style="margin: 0;" @click="$emit('showDeleteDialog', projectType); $refs.dialog.close()">Delete Project Type</ff-button>
                </div>
                <div class="flex">
                    <ff-button kind="secondary" @click="$refs['dialog'].close()">Cancel</ff-button>
                    <ff-button @click="confirm(); $refs.dialog.close()" :disabled="!formValid">{{ projectType ? 'Update' : 'Create' }}</ff-button>
                </div>
            </div>
        </template>
    </ff-dialog>
</template>

<script>
import projectTypesApi from '@/api/projectTypes'
import stacksApi from '@/api/stacks'

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

import { mapState } from 'vuex'

export default {
    name: 'AdminProjectTypeCreateDialog',
    emits: ['projectTypeUpdated', 'projectTypeCreated', 'showDeleteDialog'],
    components: {
        FormRow,
        FormHeading
    },
    data () {
        return {
            projectType: null,
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
            if (this.projectType) {
                return 'Edit project type'
            } else {
                return 'Create project type'
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

                if (this.projectType) {
                    // For edits, we cannot touch the properties
                    delete opts.properties
                    // Update
                    projectTypesApi.updateProjectType(this.projectType.id, opts).then((response) => {
                        this.$emit('projectTypeUpdated', response)
                    }).catch(err => {
                        console.log(err.response.data)
                        if (err.response.data) {
                            if (/name/.test(err.response.data.error)) {
                                this.errors.name = 'Name unavailable'
                            }
                        }
                    })
                } else {
                    projectTypesApi.create(opts).then((response) => {
                        this.$emit('projectTypeCreated', response)
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
        }
    },
    setup () {
        return {
            show (projectType) {
                this.$refs.dialog.show()
                this.projectType = projectType
                this.stacks = []
                if (projectType) {
                    this.editDisabled = projectType.projectCount > 0
                    this.input = {
                        name: projectType.name,
                        active: projectType.active,
                        properties: projectType.properties,
                        description: projectType.description,
                        // Cast to string so the v-model into FormRow works
                        // Normally you'd use v-model.number to handle this
                        // but we don't have that inside FormRow currently and
                        // this is good enough for now
                        order: '' + projectType.order
                    }
                    stacksApi.getStacks(null, null, null, projectType.id).then(stackList => {
                        this.stacks = stackList.stacks.filter(stack => stack.active).map(stack => { return { value: stack.id, label: stack.name } })
                        this.input.defaultStack = projectType.defaultStack
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
