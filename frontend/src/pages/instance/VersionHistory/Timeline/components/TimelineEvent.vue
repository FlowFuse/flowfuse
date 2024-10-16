<template>
    <div class="event flex justify-between gap-2 items-center">
        <div class="body flex flex-1 justify-between gap-2 items-center">
            <div class="graph">
                <!--                <ProjectsIcon class="ff-icon" />-->
                <component :is="icon" v-if="icon" class="ff-icon" />
                <span v-else>icon</span>
            </div>
            <div class="content flex flex-1 flex-col justify-start">
                <div class="title">{{ title }}</div>
                <div class="details">
                    <span>{{ shortTitle }}</span> | <span>{{ createdAt }}</span>
                </div>
            </div>
            <div class="username">
                {{ event.user.name }}
            </div>
        </div>
        <div class="actions">
            ...
        </div>
    </div>
</template>

<script>
import { CameraIcon } from '@heroicons/vue/outline'

import DeviceIcon from '../../../../../components/icons/DeviceSolid.js'
import NodeRedIcon from '../../../../../components/icons/NodeRed.js'
import PipelinesIcon from '../../../../../components/icons/Pipelines.js'
import ProjectsIcon from '../../../../../components/icons/Projects.js'
import UndoIcon from '../../../../../components/icons/Undo.js'

import daysSince from '../../../../../utils/daysSince.js'

export default {
    name: 'TimelineEvent',
    components: {
        ProjectsIcon,
        UndoIcon,
        DeviceIcon,
        NodeRedIcon,
        CameraIcon,
        PipelinesIcon
    },
    props: {
        event: {
            type: Object,
            required: true
        }
    },
    computed: {
        createdAt () {
            return daysSince(this.event.createdAt, true)
        },
        title () {
            switch (true) {
            case this.event.event === 'project.snapshot.imported':
                return `${this.event.data.snapshot.name} Snapshot deployed from ${this.event.data.sourceProject.name}`
            case this.event.event === 'project.snapshot.rolled-back':
                return `Snapshot Restored: ${this.event.data.snapshot.name}`
            case this.event.event === 'flows.set':
                return 'Flows Deployed From Editor'
            case this.event.event === 'project.snapshot.created':
                return `Snapshot Captured: ${this.event.data.snapshot.name}`
            case this.event.event === 'project.created':
                return 'Instance Created'
            default:
                return this.event.event
            }
        },
        shortTitle () {
            switch (true) {
            case this.event.event === 'project.snapshot.imported':
                return 'Pipeline Stage Pushed'
            case this.event.event === 'project.snapshot.rolled-back':
                return 'Snapshot Restored'
            case this.event.event === 'flows.set':
                return 'Flows Deployed'
            case this.event.event === 'project.snapshot.created':
                return '???? Flows Deployed ??????'
            case this.event.event === 'project.created':
                return 'Instance Created'
            default:
                return this.event.event
            }
        },
        icon () {
            switch (true) {
            case this.event.event === 'project.snapshot.imported':
                return PipelinesIcon
            case this.event.event === 'project.snapshot.rolled-back':
                return UndoIcon
            case this.event.event === 'flows.set':
                return ProjectsIcon
            case this.event.event === 'project.snapshot.created':
                return CameraIcon
            case this.event.event === 'project.created':
                return NodeRedIcon
            default:
                return null
            }
        }
    }
}
</script>

<style scoped lang="scss">
.event {
    padding: 15px 10px;
}
</style>
