<template>
    <div class="event flex justify-between gap-2 items-center" :class="{'snapshot-captured': isCreatedSnapshot}">
        <div class="graph">
            <span v-if="isSucceededBySnapshot && !isSnapshot" class="connector top snapshot" />
            <span
                v-if="hasSomethingToChainTo || (isSnapshot && !hasSomethingToChainTo && !isLastTimelineEvent)"
                class="connector top"
            />
            <span v-if="isCreatedSnapshot && isConnectedTo && hasSomethingToChainTo" class="connector through" />

            <div class="icon-wrapper">
                <component :is="icon" v-if="icon" class="ff-icon" />
            </div>

            <span v-if="isConnectedBy" class="connector bottom" />
            <span v-if="isPrecededBySnapshot && !isSnapshot" class="connector bottom snapshot" />
        </div>
        <div class="body flex flex-1 justify-between gap-2 items-center">
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
import { CameraIcon, PlusIcon } from '@heroicons/vue/outline'

import DeviceIcon from '../../../../../components/icons/DeviceSolid.js'
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
        PlusIcon,
        CameraIcon,
        PipelinesIcon
    },
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
                return PlusIcon
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
        isCreatedSnapshot () {
            return this.event.event === 'project.snapshot.created'
        },
        isPrecededBy () {
            const currentIndex = this.timeline.findIndex(event => event.id === this.event.id)
            return this.timeline[currentIndex + 1]
        },
        isPrecededBySnapshot () {
            return this.isPrecededBy?.event === 'project.snapshot.created'
        },
        isSucceededBy () {
            const currentIndex = this.timeline.findIndex(event => event.id === this.event.id)
            return this.timeline[currentIndex - 1]
        },
        isSucceededBySnapshot () {
            return this.isSucceededBy?.event === 'project.snapshot.created'
        },
        isSucceededByLastSnapshot () {
            return this.isSucceededBySnapshot && this.isSucceededBy?.id === this.timeline[0]?.id
        },
        isSnapshot () {
            return this.event.event === 'project.snapshot.created'
        },
        hasSomethingToChainTo () {
            const currentIndex = this.timeline.findIndex(event => event.id === this.event.id)
            for (const id in this.timeline.slice(0, currentIndex)) {
                if ([
                    'project.snapshot.imported',
                    'project.snapshot.rolled-back',
                    'flows.set',
                    'project.created'
                ].includes(this.timeline[id]?.event)) return true
            }

            return false
        },
        isLastTimelineEvent () {
            return this.isSucceededBy === undefined
        }
    }
}
</script>

<style scoped lang="scss">
.event {
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
    }

    .body {
        padding: 15px 10px;
        overflow: hidden;

        .content {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            .title {
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .details {
                font-size: 80%;
            }
        }

        .username {
            color: $ff-grey-600;
        }
    }

    .actions {
        padding: 15px 10px;
    }

    &.snapshot-captured {
        background: $ff-grey-100;
        color: $ff-grey-500;

        .graph {
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

        .body {

        }
    }
}
</style>
