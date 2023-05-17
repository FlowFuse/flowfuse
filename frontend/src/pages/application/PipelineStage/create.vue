<template>
    <Teleport
        v-if="mounted"
        to="#platform-sidenav"
    >
        <SideNavigation>
            <template #options>
                <a @click="$router.back()">
                    <nav-item
                        :icon="icons.chevronLeft"
                        label="Back"
                    />
                </a>
            </template>
        </SideNavigation>
    </Teleport>
    <main>
        <ff-loading
            v-if="loading"
            message="Creating Pipeline Stage..."
        />
        <form
            v-else
            class="space-y-6"
            @submit.prevent="create"
        >
            <SectionTopMenu
                :hero="'Add Pipeline Stage'"
            />

            <!-- Form Description -->
            <div class="mb-8 text-sm text-gray-500">
                Create a DevOps Pipeline for linking Node-RED Instances together.
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
                    Add Stage
                </ff-button>
            </div>
        </form>
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

import ApplicationAPI from '../../../api/application.js'
import PipelinesAPI from '../../../api/pipeline.js'

import FormRow from '../../../components/FormRow.vue'
import NavItem from '../../../components/NavItem.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import SideNavigation from '../../../components/SideNavigation.vue'
import Alerts from '../../../services/alerts.js'

export default {
    name: 'CreatePipeline',
    components: {
        SideNavigation,
        SectionTopMenu,
        NavItem,
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
        }
    },
    data () {
        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            mounted: false,
            loading: false,
            instances: [],
            input: {
                name: null,
                instance: null
            }
        }
    },
    computed: {
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
                return !instanceIdsInUse.has(instance.id)
            })
        },
        instanceOptions () {
            return this.instancesNotInUse.map((instance) => {
                return {
                    label: instance.name,
                    value: instance.id
                }
            })
        }
    },
    watch: {
        'application.id': 'loadInstances'
    },
    async mounted () {
        this.mounted = true
        this.load()
    },
    methods: {
        async create () {
            this.loading = true
            const options = {
                name: this.input.name,
                instance: this.input.instance
            }
            if (this.$route.query.sourceStage) {
                options.source = this.$route.query.sourceStage
            }
            await PipelinesAPI.addPipelineStage(this.$route.params.pipelineId, options)
            Alerts.emit('Pipeline stage successfully added.', 'confirmation')
            this.loading = false
            this.$router.push({
                name: 'ApplicationPipelines',
                params: {
                    id: this.$route.params.applicationId
                }
            })
        },
        load () {
            this.loadInstances()
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
