<template>
    <div class="ff-pipeline-stage ff-pipeline-stage-ghost">
        <PlusCircleIcon class="ff-icon ff-icon-lg" />
        <label>Add Stage</label>
    </div>
</template>

<script>
import { PlusCircleIcon } from '@heroicons/vue/outline'

export default {
    name: 'PipelineStage',
    components: {
        PlusCircleIcon
    },
    props: {

    }
}
</script>
