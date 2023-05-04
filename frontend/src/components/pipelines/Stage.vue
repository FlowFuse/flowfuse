<template>
    <div v-if="stage" class="ff-pipeline-stage">
        <div class="ff-pipeline-stage-banner">
            <label>{{ stage.name }}</label>
            <div class="ff-pipeline-actions">
                <PlayIcon class="ff-icon" />
                <CogIcon class="ff-icon" />
            </div>
        </div>
        <div v-if="stage.instance" class="py-3">
            <div class="ff-pipeline-stage-row">
                <label>Name:</label>
                <span>{{ stage.instance.name }}</span>
            </div>
            <div class="ff-pipeline-stage-row">
                <label>URL:</label>
                <span>{{ stage.instance.url }}</span>
            </div>
            <div class="ff-pipeline-stage-row">
                <label>Last Deployed:</label>
                <span>{{ stage.instance.updatedAt }}</span>
            </div>
            <div class="ff-pipeline-stage-row">
                <label>Status:</label>
                <InstanceStatusBadge status="TODO" />
            </div>
        </div>
        <div v-else class="flex justify-center py-6">
            No Instances Bound
        </div>
    </div>
    <div v-else class="ff-pipeline-stage ff-pipeline-stage-ghost">
        <PlusCircleIcon class="ff-icon ff-icon-lg" />
        <label>Add Stage</label>
    </div>
</template>

<script>
import { CogIcon, PlayIcon, PlusCircleIcon } from '@heroicons/vue/outline'

import InstanceStatusBadge from '../../pages/instance/components/InstanceStatusBadge.vue'

export default {
    name: 'PipelineStage',
    components: {
        CogIcon,
        PlayIcon,
        PlusCircleIcon,
        InstanceStatusBadge
    },
    props: {
        stage: {
            default: null,
            type: Object
        }
    }
}
</script>
