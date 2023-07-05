<template>
    <ff-loading
        v-if="loading.create"
        message="Creating Pipeline Stage..."
    />
    <ff-loading
        v-else-if="loading.update"
        message="Updating Pipeline Stage..."
    />
    <form
        class="space-y-6"
        @submit.prevent="submit"
    >
        <SectionTopMenu
            :hero="'Edit Pipeline Stage'"
        />

        <!-- Form Description -->
        <div class="mb-8 text-sm text-gray-500">
            Update existing pipeline stage from {{ pipeline?.name }}.
        </div>

        <!-- Stage Name -->
        <FormRow
            v-model="input.name"
            type="text"
            data-form="stage-name"
        >
            <template #default>
                Stage name
            </template>
        </FormRow>

        <!-- Instance -->
        <FormRow
            v-model="input.instanceId"
            :options="instanceOptions"
            data-form="stage-instance"
            :placeholder="instanceDropdownPlaceholder"
            :disabled="instanceDropdownDisabled"
        >
            <template #default>
                Choose Instance
            </template>
        </FormRow>

        <!-- Deploy to Devices -->
        <FormRow
            v-model="input.deployToDevices"
            type="checkbox"
            data-form="stage-deploy-to-devices"
            :disabled="!sourceStage"
            class="max-w-md"
        >
            Deploy to Devices <template v-if="!sourceStage">- Not available for first stage in pipeline</template>
            <template #description>
                When this stage is deployed to changes will also be be deployed to all devices connected to this stages instance.
            </template>
        </FormRow>

        <div class="flex flex-wrap gap-1 items-center">
            <ff-button
                class="ff-btn--secondary"
                @click="$router.back()"
            >
                Cancel
            </ff-button>

            <ff-button
                :disabled="!submitEnabled"
                data-action="add-stage"
                type="submit"
            >
                <span v-if="isEdit">
                    Update Stage
                </span>
                <span v-else>
                    Add Stage
                </span>
            </ff-button>
        </div>
    </form>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

import FormRow from '../../../components/FormRow.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'

export default {
    name: 'PipelineForm',
    components: {
        SectionTopMenu,
        FormRow
    },
    props: {
        instances: {
            type: Array,
            required: true
        },
        pipeline: {
            type: Object,
            required: true
        },
        stage: {
            type: Object,
            default () {
                return {}
            }
        },
        sourceStage: {
            type: Boolean,
            default: true // TODO: Disabled for not
        }
    },
    emits: ['submit'],
    data () {
        const stage = this.stage

        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            loading: {
                create: false,
                update: false
            },
            input: {
                name: stage?.name,
                instanceId: stage.instances?.[0].id,
                deployToDevices: stage.deployToDevices
            }
        }
    },
    computed: {
        isEdit () {
            return !!this.stage.id
        },
        formDirty () {
            return (
                this.input.name !== this.stage.name ||
                this.input.instanceId !== this.stage.instances?.[0].id ||
                this.input.deployToDevices !== this.stage.deployToDevices
            )
        },
        submitEnabled () {
            return this.formDirty && this.input.instanceId && this.input.name
        },
        instancesNotInUse () {
            const instanceIdsInUse = this.pipeline.stages.reduce((acc, stage) => {
                stage.instances.forEach((instance) => {
                    acc.add(instance.id)
                })

                return acc
            }, new Set())

            return this.instances.filter((instance) => {
                return !instanceIdsInUse.has(instance.id) || instance.id === this.input.instanceId
            })
        },
        instanceOptions () {
            return this.instancesNotInUse.map((instance) => {
                return {
                    label: instance.name,
                    value: instance.id
                }
            })
        },
        instanceDropdownDisabled () {
            return this.instancesNotInUse.length === 0
        },
        instanceDropdownPlaceholder () {
            if (this.instancesNotInUse.length === 0) {
                return 'No instances available'
            }

            return 'Choose Instance'
        }
    },
    methods: {
        async submit () {
            this.loading.creating = !this.isEdit
            this.loading.updating = this.isEdit

            this.$emit('submit', this.input)
        }
    }
}
</script>
