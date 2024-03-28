<template>
    <ff-dialog ref="dialog" :header="dialogTitle">
        <template #default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <div v-if="error" data-el="form-row-error" class="ml-4 text-red-400 text-xs">{{ error }}</div>

                <FormRow v-model="input.name" :error="errors.name" data-form="name">Name</FormRow>
                <FormRow v-model="input.active" type="checkbox" data-form="active">
                    Active
                    <template #description>
                        Display this blueprint in the list of available blueprints
                    </template>
                </FormRow>

                <FormRow v-model="input.default" type="checkbox" :error="errors.default" data-form="default">
                    Default Blueprint
                    <template #description>
                        Set this as the default blueprint for new instances
                    </template>
                </FormRow>

                <FormRow data-form="teamTypeScope" wrapper-class="flex flex-col flex-row relative">
                    Team Type availability
                    <template #description> Select the team types that can use this blueprint </template>
                    <template #input>
                        <div class="grid gap-1">
                            <div>
                                <ff-checkbox id="availableToAll" v-model="availableToAll" type="checkbox" label="All team types" />
                            </div>
                            <template v-if="!availableToAll">
                                <div v-for="teamType in input.teamTypeScope" :key="teamType.id">
                                    <ff-checkbox :id="teamType.id" v-model="teamType.enabled" type="checkbox" :label="teamType.name" />
                                </div>
                            </template>
                        </div>
                    </template>
                </FormRow>

                <FormRow v-model="input.category" :error="errors.category" data-form="category">
                    Category
                    <template #description>Freeform (case-sensitive) category</template>
                </FormRow>

                <FormRow v-model="input.icon" :error="errors.icon" data-form="icon">
                    Custom Icon
                    <template #description>From https://v1.heroicons.com/, falls back to category icon</template>
                </FormRow>

                <FormRow v-model="input.order" type="number" :error="errors.order" data-form="order">
                    Custom Order
                    <template #description>Used to sort blueprints, lowest to highest</template>
                </FormRow>

                <FormRow v-model="input.description" :error="errors.description" data-form="description">
                    Description
                    <template #description>Use markdown for formatting</template>
                    <template #input><textarea v-model="input.description" class="w-full" rows="4" /></template>
                </FormRow>

                <FormRow v-model="input.flows" :error="errors.flows" data-form="flows">
                    Flows
                    <template #description>JSON representation of the flows for this template</template>
                    <template #input><textarea v-model="input.flows" class="w-full" rows="4" /></template>
                </FormRow>

                <FormRow v-model="input.modules" :error="errors.modules" data-form="modules">
                    Modules
                    <template #description>JSON representation of the npm modules required for this template</template>
                    <template #input><textarea v-model="input.modules" class="w-full" rows="4" /></template>
                </FormRow>
            </form>
        </template>
        <template #actions>
            <div class="w-full grow flex justify-between">
                <div>
                    <ff-button v-if="flowBlueprint?.id" kind="danger" style="margin: 0;" @click="$emit('show-delete-dialog', flowBlueprint); $refs.dialog.close()">Delete Flow Blueprint</ff-button>
                </div>
                <div class="flex">
                    <ff-button kind="secondary" @click="$refs['dialog'].close()">Cancel</ff-button>
                    <ff-button :disabled="!formValid" data-form="confirm-dialog" @click="confirm">{{ flowBlueprint?.id ? 'Update' : 'Create' }}</ff-button>
                </div>
            </div>
        </template>
    </ff-dialog>
</template>

<script>
import FlowBlueprintsApi from '../../../../api/flowBlueprints.js'

import FormRow from '../../../../components/FormRow.vue'

/**
 * @typedef {import('../../../../api/flowBlueprints').FlowBlueprint} FlowBlueprint
 */

export default {
    name: 'AdminFlowBlueprintForm',
    components: {
        FormRow
    },
    emits: ['show-delete-dialog', 'flow-blueprint-created', 'flow-blueprint-updated'],
    setup () {
        return {
            /**
             * Show the dialog
             * @param {FlowBlueprint} [flowBlueprint] - The flow blueprint to edit or null to create a new one
             * @param {{id: string, name: string, order: number}[]} teamTypes - The team types to select from
             */
            show (flowBlueprint, teamTypes) {
                this.$refs.dialog.show()
                this.flowBlueprint = flowBlueprint
                teamTypes = teamTypes || []
                this.input = {
                    name: flowBlueprint?.name ?? '',
                    active: flowBlueprint?.active ?? true,
                    category: flowBlueprint?.category ?? '',
                    description: flowBlueprint?.description ?? '',
                    icon: flowBlueprint?.icon ?? '',
                    order: flowBlueprint?.order ?? '',
                    default: flowBlueprint?.default ?? false,

                    flows: flowBlueprint?.flows ? JSON.stringify(flowBlueprint.flows) : '',
                    modules: flowBlueprint?.modules ? JSON.stringify(flowBlueprint.modules) : '',
                    teamTypeScope: teamTypes.map(t => ({ id: t.id, name: t.name, enabled: flowBlueprint?.teamTypeScope?.includes(t.id) || false }))
                }
                this.availableToAll = !flowBlueprint?.teamTypeScope
                this.errors = {}
                this.error = null
            }
        }
    },
    data () {
        return {
            flowBlueprint: null,
            teamTypes: [],
            input: {
                name: '',
                active: true,
                description: '',
                properties: {},
                defaultStack: '',
                icon: '',
                default: false,
                teamTypeScope: [],
                order: 0
            },
            availableToAll: true, // assume all are available by default
            errors: {},
            error: null
        }
    },
    computed: {
        formValid () {
            return this.input.name && this.input.flows && this.input.modules
        },
        dialogTitle () {
            return this.flowBlueprint?.id ? 'Edit Flow Blueprint' : 'Create Flow Blueprint'
        }
    },
    methods: {
        async confirm () {
            if (!this.formValid) {
                return
            }

            this.error = null
            this.errors = {}

            const flowBlueprintProps = { ...this.input }
            if (flowBlueprintProps.order === '') {
                delete flowBlueprintProps.order
            }

            if (this.availableToAll) {
                flowBlueprintProps.teamTypeScope = null
            } else {
                flowBlueprintProps.teamTypeScope = this.input.teamTypeScope.filter(t => t.enabled).map(t => t.id)
            }

            // Validation
            try {
                flowBlueprintProps.flows = JSON.parse(flowBlueprintProps.flows)
            } catch (err) {
                this.error = 'Invalid JSON for flows'
                this.errors.flows = err
                return
            }
            try {
                flowBlueprintProps.modules = JSON.parse(flowBlueprintProps.modules)
            } catch (err) {
                this.error = 'Invalid JSON for modules'
                this.errors.modules = err
                return
            }

            try {
                // Update
                if (this.flowBlueprint?.id) {
                    const flowBlueprint = await FlowBlueprintsApi.updateFlowBlueprint(this.flowBlueprint.id, flowBlueprintProps)
                    this.$emit('flow-blueprint-updated', flowBlueprint)

                // Create
                } else {
                    const flowBlueprint = await FlowBlueprintsApi.createFlowBlueprint(flowBlueprintProps)
                    this.$emit('flow-blueprint-created', flowBlueprint)
                }

                return this.$refs.dialog.close()
            } catch (error) {
                console.error(error.response.data)
                if (error.response?.data?.error) {
                    const errorResponse = error.response.data
                    this.error = errorResponse.error
                    if (this.error.includes('flows')) {
                        this.errors.flows = this.error
                    }
                    if (this.error.includes('modules')) {
                        this.errors.modules = this.error
                    }
                } else {
                    this.error = 'Unknown error, please try again'
                }
            }
        }
    }
}
</script>
