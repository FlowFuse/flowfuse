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
            v-if="!stage?.id"
        />
        <PipelineStageForm
            v-else
            :instances="instances"
            :pipeline="pipeline"
            :stage="stage"
            @submit="update"
        />
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

import PipelinesAPI from '../../../api/pipeline.js'

import NavItem from '../../../components/NavItem.vue'
import SideNavigation from '../../../components/SideNavigation.vue'

import Alerts from '../../../services/alerts.js'

import PipelineStageForm from './form.vue'

export default {
    name: 'EditPipelineStage',
    components: {
        SideNavigation,
        NavItem,
        PipelineStageForm
    },
    props: {
        application: {
            type: Object,
            required: true
        },
        instances: {
            type: Array,
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
            stage: null
        }
    },
    async mounted () {
        this.mounted = true
        this.loadStage()

        this.$watch(
            () => this.$route.params.stageId,
            async () => {
                if (!this.$route.params.stageId) {
                    return
                }

                await this.loadStage()
            }
        )
    },
    methods: {
        async update (input) {
            const options = {
                name: input.name,
                instanceId: input.instanceId
            }

            await PipelinesAPI.updatePipelineStage(this.pipeline.id, this.stage.id, options)
            Alerts.emit('Pipeline stage successfully updated.', 'confirmation')

            this.$router.push({
                name: 'ApplicationPipelines',
                params: {
                    id: this.application.id
                }
            })
        },
        async loadStage () {
            if (!this.pipeline.id) {
                return
            }

            this.stage = await PipelinesAPI.getPipelineStage(this.pipeline.id, this.$route.params.stageId)
        }
    }
}
</script>
