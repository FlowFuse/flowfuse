<template>
    <div v-if="stage" class="ff-pipeline-stage">
        <div class="ff-pipeline-stage-banner">
            <label>{{ stage.name }}</label>
            <div class="ff-pipeline-actions">
                <PlayIcon v-if="playEnabled && !deploying" class="ff-icon ff-clickable" @click="runStage" />
                <SpinnerIcon v-if="deploying" class="ff-icon" />
            </div>
        </div>
        <div v-if="stage.instance" class="py-3">
            <div class="ff-pipeline-stage-row">
                <label>Instance:</label>
                <span>{{ stage.instance.name }}</span>
            </div>
            <div class="ff-pipeline-stage-row">
                <label>URL:</label>
                <span>{{ stage.instance.url }}</span>
            </div>
            <div class="ff-pipeline-stage-row">
                <label>Last Deployed:</label>
                <span>{{ lastDeployed }} ago</span>
            </div>
            <div class="ff-pipeline-stage-row">
                <label>Status:</label>
                <InstanceStatusBadge :status="status" />
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
import { PlayIcon, PlusCircleIcon } from '@heroicons/vue/outline'

import InstancesAPI from '../../api/instances.js'
import PipelineAPI from '../../api/pipeline.js'
import InstanceStatusBadge from '../../pages/instance/components/InstanceStatusBadge.vue'
import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import elapsedTime from '../../utils/elapsedTime.js'
import SpinnerIcon from '../icons/Spinner.js'

export default {
    name: 'PipelineStage',
    components: {
        SpinnerIcon,
        PlayIcon,
        PlusCircleIcon,
        InstanceStatusBadge
    },
    props: {
        pipelineId: {
            default: null,
            type: String
        },
        stage: {
            default: null,
            type: Object
        },
        deploying: {
            defaut: false,
            type: Boolean
        },
        status: {
            default: null,
            type: String
        },
        playEnabled: {
            default: true,
            type: Boolean
        }
    },
    emits: [
        'stage-started',
        'stage-complete'
    ],
    computed: {
        lastDeployed: function () {
            return elapsedTime(this.stage.instance.updatedAt, new Date())
        }
    },
    methods: {
        runStage: async function () {
            // get target stage
            const target = await PipelineAPI.getPipelineStage(this.pipelineId, this.stage.targetStage)
            if (!target) {
                Alerts.emit(`Unable to find configured target for stage "${this.stage.name}".`, 'error')
            }

            const msg = {
                header: `Push to "${target.name}"`,
                html: `<p>Are you sure you want to push from "${this.stage.name}" to "${target.name}"?</p><p>This will copy over all flows, nodes and credentials from "${this.stage.name}".</p><p>It will also transfer the keys of any newly created Environment Variables that your target instance does not currently have.</p>`
            }

            Dialog.show(msg, async () => {
                this.$emit('stage-started')

                // settings for when we deploy to a new stage
                this.parts = {
                    flows: true,
                    credentials: true,
                    template: false,
                    nodes: true,
                    settings: false,
                    envVars: 'keys'
                }

                const source = {
                    id: this.stage.instance.id,
                    options: { ...this.parts }
                }

                await InstancesAPI.updateInstance(target.instance.id, { sourceProject: source })

                this.$emit('stage-complete')
                Alerts.emit(`Deployment from "${this.stage.name}" to "${target.name}" has started.`, 'confirmation')
            })
        }
    }
}
</script>
