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
        <PipelineStageForm
            :application="application"
            :pipeline="pipeline"
            :stage="{}"
            @submit="create"
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
    name: 'CreatePipelineStage',
    components: {
        SideNavigation,
        NavItem,
        PipelineStageForm
    },
    inheritAttrs: false,
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
            mounted: false
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async create (input) {
            const options = {
                name: input.name,
                instance: input.instance
            }
            if (this.$route.query.sourceStage) {
                options.source = this.$route.query.sourceStage
            }
            await PipelinesAPI.addPipelineStage(this.$route.params.pipelineId, options)
            Alerts.emit('Pipeline stage successfully added.', 'confirmation')

            this.$router.push({
                name: 'ApplicationPipelines',
                params: {
                    id: this.application.id
                }
            })
        }
    }
}
</script>
