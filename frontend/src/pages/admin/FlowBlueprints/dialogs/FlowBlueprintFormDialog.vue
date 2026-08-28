<template>
    <ff-dialog ref="dialog" :header="dialogTitle">
        <template #default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <div v-if="error" data-el="form-row-error" class="ml-4 text-red-400 text-xs">{{ error }}</div>

                <FormRow v-model="input.name" :error="errors.name" data-form="name">{{ $t('ui.name') }}</FormRow>
                <FormRow v-model="input.active" type="checkbox" data-form="active">
                    {{ $t('ui.active') }}
                    <template #description>
                        {{ $t('ui.displayThisBlueprintInTheListOfAvailableBlueprin') }}
                    </template>
                </FormRow>

                <FormRow v-model="input.default" type="checkbox" :error="errors.default" data-form="default">
                    {{ $t('ui.defaultBlueprint') }}
                    <template #description>
                        {{ $t('ui.setThisAsTheDefaultBlueprintForNewInstances') }}
                    </template>
                </FormRow>

                <FormRow data-form="teamTypeScope" wrapper-class="flex flex-col flex-row relative">
                    {{ $t('ui.teamTypeAvailability') }}
                    <template #description> {{ $t('ui.selectTheTeamTypesThatCanUseThisBlueprint') }} </template>
                    <template #input>
                        <div class="grid gap-1">
                            <div>
                                <ff-checkbox id="availableToAll" v-model="availableToAll" type="checkbox" :label="$t('ui.allTeamTypes')" />
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
                    {{ $t('ui.category') }}
                    <template #description>{{ $t('ui.freeformCaseSensitiveCategory') }}</template>
                </FormRow>

                <FormRow v-model="input.icon" :error="errors.icon" data-form="icon">
                    {{ $t('ui.customIcon') }}
                    <template #description>{{ $t('ui.kebabCaseHeroiconsComOutlineNameEGGlobeAltV1Name') }}</template>
                </FormRow>

                <FormRow v-model="input.order" type="number" :error="errors.order" data-form="order">
                    {{ $t('ui.customOrder') }}
                    <template #description>{{ $t('ui.usedToSortBlueprintsLowestToHighest') }}</template>
                </FormRow>

                <FormRow v-model="input.description" :error="errors.description" data-form="description">
                    {{ $t('ui.description') }}
                    <template #description>{{ $t('ui.useMarkdownForFormatting') }}</template>
                    <template #input><textarea v-model="input.description" class="w-full" rows="4" /></template>
                </FormRow>

                <FormRow v-model="input.flows" :error="errors.flows" data-form="flows">
                    {{ $t('ui.flows') }}
                    <template #description>{{ $t('ui.jsonRepresentationOfTheFlowsForThisTemplate') }}</template>
                    <template #input><textarea v-model="input.flows" class="w-full" rows="4" /></template>
                </FormRow>

                <FormRow v-model="input.modules" :error="errors.modules" data-form="modules">
                    {{ $t('ui.modules') }}
                    <template #description>{{ $t('ui.jsonRepresentationOfTheNpmModulesRequiredForThis') }}</template>
                    <template #input><textarea v-model="input.modules" class="w-full" rows="4" /></template>
                </FormRow>

                <FormRow v-model="input.externalUrl" :error="errors.externalUrl" data-form="modules">
                    {{ $t('ui.externalUrl') }}
                    <template #description>{{ $t('ui.externalUrl') }}</template>
                </FormRow>
            </form>
        </template>
        <template #actions>
            <div class="w-full grow flex justify-between">
                <div>
                    <ff-button v-if="flowBlueprint?.id" kind="danger" style="margin: 0;" @click="$emit('show-delete-dialog', flowBlueprint); $refs.dialog.close()">{{ $t('ui.deleteFlowBlueprint') }}</ff-button>
                </div>
                <div class="flex">
                    <ff-button kind="secondary" @click="$refs['dialog'].close()">{{ $t('ui.cancel') }}</ff-button>
                    <ff-button :disabled="!formValid" data-form="confirm-dialog" @click="confirm">{{ flowBlueprint?.id ? 'Update' : 'Create' }}</ff-button>
                </div>
            </div>
        </template>
    </ff-dialog>
</template>

<script>
import FlowBlueprintsApi from '../../../../api/flowBlueprints.js'

import FormRow from '../../../../components/FormRow.vue'
import { t } from '../../../../i18n.js'
import { HEROICONS_V1_TO_V2_KEBAB_CASE } from '../../../../utils/heroicons-v1-aliases'

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
                    icon: HEROICONS_V1_TO_V2_KEBAB_CASE[flowBlueprint?.icon] ?? flowBlueprint?.icon ?? '',
                    order: flowBlueprint?.order ?? '',
                    default: flowBlueprint?.default ?? false,
                    externalUrl: flowBlueprint?.externalUrl ?? '',

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
                externalUrl: 'false',
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
                JSON.parse(flowBlueprintProps.flows)
            } catch (err) {
                this.error = 'Invalid JSON for flows'
                this.errors.flows = t('ui.invalidJson')
                return
            }

            try {
                if (!JSON.parse(flowBlueprintProps.flows).flows) {
                    throw new Error('Flow json missing \'flows\' property')
                }
                if (!Array.isArray(JSON.parse(flowBlueprintProps.flows).flows)) {
                    throw new Error("Flow json 'flows' property not an Array")
                }
            } catch (err) {
                this.error = err
                this.errors.flows = err
                return
            }

            flowBlueprintProps.flows = JSON.parse(flowBlueprintProps.flows)

            try {
                flowBlueprintProps.modules = JSON.parse(flowBlueprintProps.modules)

                if (
                    [
                        typeof flowBlueprintProps.modules === 'string',
                        typeof flowBlueprintProps.modules === 'number',
                        Array.isArray(flowBlueprintProps.modules)
                    ].some(condition => condition === true)
                ) {
                    throw new Error()
                }
            } catch (err) {
                this.error = 'Invalid JSON for modules'
                this.errors.modules = t('ui.modulesShouldBeAnObjectOfModuleVersionPairs')
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
