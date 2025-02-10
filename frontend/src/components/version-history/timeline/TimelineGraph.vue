<template>
    <div class="graph" :class="{'is-snapshot': isSnapshot}">
        <span v-if="isSucceededBySnapshot && (!isSnapshot || isLoadMore)" class="connector top snapshot" />
        <span
            v-if="hasSomethingToChainTo || (isSnapshot && !hasSomethingToChainTo && !isLastTimelineEvent)"
            class="connector top"
        />
        <span v-if="isSnapshot && isConnectedTo && hasSomethingToChainTo" class="connector through" />

        <div class="icon-wrapper">
            <component :is="icon" v-if="icon" class="ff-icon" />
        </div>

        <span v-if="isConnectedBy" class="connector bottom" />
        <span v-if="isPrecededBySnapshot && !isSnapshot" class="connector bottom snapshot" />
    </div>
</template>

<script>
import { AdjustmentsIcon, CameraIcon, DotsHorizontalIcon, DownloadIcon, PlusIcon, RefreshIcon } from '@heroicons/vue/outline'

import PipelinesIcon from '../../icons/Pipelines.js'
import ProjectsIcon from '../../icons/Projects.js'
import UndoIcon from '../../icons/Undo.js'

export default {
    name: 'TimelineGraph',
    props: {
        event: {
            type: Object,
            required: true
        },
        timeline: {
            type: Array,
            required: true
        }
    },
    computed: {
        icon () {
            switch (true) {
            case this.event.event === 'project.snapshot.imported':
                // we can only differentiate between a plain snapshot import and a devops deployment history events
                // by its data payload (i.e. if the event has a data.sourceProject attr, we know it's from a devops pipeline)
                if (Object.prototype.hasOwnProperty.call(this.event.data, 'sourceProject')) {
                    return PipelinesIcon
                } else return DownloadIcon
            case this.event.event === 'project.snapshot.rolled-back':
                return UndoIcon
            case this.event.event === 'flows.set':
                return ProjectsIcon
            case this.event.event === 'project.snapshot.created':
                return CameraIcon
            case ['project.settings.updated', 'device.settings.updated'].includes(this.event.event):
                return AdjustmentsIcon
            case ['device.restarted'].includes(this.event.event):
                return RefreshIcon
            case this.event.event === 'project.created':
                return PlusIcon
            case this.event.event === 'load-more':
                return DotsHorizontalIcon
            default:
                return null
            }
        },
        isConnectedBy () {
            return this.event.event !== 'project.created'
        },
        isConnectedTo () {
            return this.timeline[0].id !== this.event.id
        },
        isPrecededBy () {
            const currentIndex = this.timeline.findIndex(event => event.id === this.event.id)
            return this.timeline[currentIndex + 1]
        },
        isPrecededBySnapshot () {
            // we can only differentiate between a plain snapshot import and a devops deployment history events
            // by its data payload (i.e. if the event has a data.sourceProject attr, we know it's from a devops pipeline)
            const isPrecededByImportedSnapshot = this.isPrecededBy?.event === 'project.snapshot.imported' &&
                !Object.prototype.hasOwnProperty.call(this.isPrecededBy?.data, 'sourceProject')

            return this.isPrecededBy?.event === 'project.snapshot.created' || isPrecededByImportedSnapshot
        },
        isSucceededBy () {
            const currentIndex = this.timeline.findIndex(event => event.id === this.event.id)
            return this.timeline[currentIndex - 1]
        },
        isSucceededBySnapshot () {
            // we can only differentiate between a plain snapshot import and a devops deployment history events
            // by its data payload (i.e. if the event has a data.sourceProject attr, we know it's from a devops pipeline)
            const isSucceededByImportedSnapshot = this.isSucceededBy?.event === 'project.snapshot.imported' &&
                !Object.prototype.hasOwnProperty.call(this.isSucceededBy?.data, 'sourceProject')

            return this.isSucceededBy?.event === 'project.snapshot.created' || isSucceededByImportedSnapshot
        },
        isSnapshot () {
            // we can only differentiate between a plain snapshot import and a devops deployment history events
            // by its data payload (i.e. if the event has a data.sourceProject attr, we know it's from a devops pipeline)
            const isImportedSnapshot = this.event.event === 'project.snapshot.imported' &&
                !Object.prototype.hasOwnProperty.call(this.event.data, 'sourceProject')

            return this.event.event === 'project.snapshot.created' || isImportedSnapshot
        },
        hasSomethingToChainTo () {
            const currentIndex = this.timeline.findIndex(event => event.id === this.event.id)
            for (const id in this.timeline.slice(0, currentIndex)) {
                if ((this.timeline[id]?.event) === 'project.snapshot.imported') {
                    // we can only differentiate between a plain snapshot import and a devops deployment history events
                    // by its data payload (i.e. if the event has a data.sourceProject attr, we know it's from a devops pipeline)
                    const isPipelineDeployment = Object.prototype.hasOwnProperty.call(this.timeline[id]?.data, 'sourceProject')
                    if (isPipelineDeployment) return true
                } else if ([
                    'project.snapshot.rolled-back',
                    'flows.set',
                    'project.created',
                    'project.settings.updated',
                    'device.settings.updated'
                ].includes(this.timeline[id]?.event)) return true
            }

            return false
        },
        isLastTimelineEvent () {
            return this.isSucceededBy === undefined
        },
        isLoadMore () {
            return this.event.event === 'load-more'
        }
    }
}
</script>

<style scoped lang="scss">
.graph {
    min-width: 64px;
    padding: 15px;
    position: relative;
    overflow: hidden;

    .icon-wrapper {
        min-width: 34px;
        min-height: 35px;
        border: 2px solid $ff-blue-800;
        border-radius: 50%;
        padding: 5px;
        background: #fff;
        position: relative;
        z-index: 10;
        color: $ff-blue-800;
    }

    .connector {
        border: 1px solid $ff-blue-800;
        position: absolute;
        left: 47%;  // compensates for border width
        z-index: 5;

        &.top {
            top: -230px;
            height: 250px;

            &.snapshot {
                transform: rotate(45deg);
                top: -25%;
                left: 80%;
                height: 50px;
                border-style: dashed;
                border-color: $ff-grey-500;
            }
        }

        &.bottom {
            bottom: -200px;
            height: 230px;
            &.snapshot {
                transform: rotate(-45deg);
                top: 50%;
                left: 83%;
                height: 50px;
                border-style: dashed;
                border-color: $ff-grey-500;
            }
        }

        &.through {
            bottom: -100px;
            height: 230px;
            left: 30px;
        }
    }

    &.is-snapshot {
        padding-left: 45px;
        min-width: 94px;

        .connector {
            &.top, &.bottom {
                left: 65%;
                border-color: $ff-grey-500;
                border-style: dashed;
            }
        }
    }
}
</style>
