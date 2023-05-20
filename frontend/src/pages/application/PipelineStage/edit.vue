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
            :application="application"
            :pipeline="pipeline"
            :stage="stage"
            @submit="create"
        />
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

import PipelinesAPI from '../../../api/pipeline.js'

import NavItem from '../../../components/NavItem.vue'
import SideNavigation from '../../../components/SideNavigation.vue'

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
                await this.loadStage()
            }
        )
    },
    methods: {
        async update () {
            console.log('Update logic to be implemented')
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
