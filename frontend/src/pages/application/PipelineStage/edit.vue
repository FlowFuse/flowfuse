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
                :options="instances"
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
                name,
                instance: null
            }
        }
    },
    computed: {
        submitEnabled: () => {
            return true
        }
    },
    async mounted () {
        this.mounted = true
        this.loadInstances()
    },
    methods: {
        async create () {
            this.loading = true
            await PipelinesAPI.addPipelineStage(this.$route.params.pipelineId, this.input.name)
            Alerts.emit('Pipeline stage successfully added.', 'confirmation')
            this.loading = false
            this.$router.push({
                name: 'ApplicationPipelines',
                params: {
                    id: this.$route.params.applicationId
                }
            })
        },
        async loadInstances () {
            const application = this.$route.params.applicationId
            const instances = await ApplicationAPI.getApplicationInstances(application)
            this.instances = instances.map((instance) => {
                return {
                    label: instance.name,
                    value: instance.id
                }
            })
        }
    }
}
</script>
