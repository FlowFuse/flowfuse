<template>
    <div v-if="stage" class="ff-pipeline-stage">
        <div class="ff-pipeline-stage-banner">
            <label>{{ stage.name }}</label>
            <div class="ff-pipeline-actions">
                <PlayIcon class="ff-icon" />
                <CogIcon class="ff-icon" />
            </div>
        </div>
        <div v-if="stage.instances">
            {{ stage.instances }}
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

export default {
    name: 'PipelineStage',
    components: {
        CogIcon,
        PlayIcon,
        PlusCircleIcon
    },
    props: {
        stage: {
            default: null,
            type: Object
        }
    }
}
</script>
