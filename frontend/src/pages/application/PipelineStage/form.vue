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
            v-model="input.instance"
            :options="instanceOptions"
            data-form="stage-instance"
            :placeholder="instanceDropdownPlaceholder"
            :disabled="instanceDropdownDisabled"
        >
            <template #default>
                Choose Instance
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
                :data-action="'create-pipeline'"
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

import ApplicationAPI from '../../../api/application.js'

import FormRow from '../../../components/FormRow.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'

export default {
    name: 'PipelineForm',
    components: {
        SectionTopMenu,
        FormRow
    },
    props: {
        application: {
            type: Object,
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
            instances: [],
            input: {
                name: stage?.name,
                instance: stage?.instances?.[0]
            }
        }
    },
    computed: {
        isEdit () {
            return !!this.stage.id
        },
        submitEnabled () {
            return this.input.instance && this.input.name
        },
        instancesNotInUse () {
            const instanceIdsInUse = this.pipeline.stages.reduce((acc, stage) => {
                stage.instances.forEach((instance) => {
                    acc.add(instance.id)
                })

                return acc
            }, new Set())

            return this.instances.filter((instance) => {
                return !instanceIdsInUse.has(instance.id) || instance.id === this.input.instance?.id
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
    watch: {
        'application.id': 'loadInstances'
    },
    async mounted () {
        this.loadInstances()
    },
    methods: {
        async submit () {
            this.loading.creating = !this.isEdit
            this.loading.updating = this.isEdit

            this.$emit('submit', this.input)
        },
        async loadInstances  () {
            if (!this.application.id) {
                return
            }

            this.instances = await ApplicationAPI.getApplicationInstances(this.application.id)
        }
    }
}
</script>
