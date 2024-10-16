<template>
    <div class="event flex justify-between gap-1 items-center" :class="{'is-snapshot': isSnapshot}">
        <timeline-graph :event="event" :timeline="timeline" />

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
import daysSince from '../../../../../utils/daysSince.js'

import TimelineGraph from './TimelineGraph.vue'

export default {
    name: 'TimelineEvent',
    components: { TimelineGraph },
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
                // eslint-disable-next-line no-case-declarations
                const splitName = this.event.data.snapshot.name.split(' - Deploy')[0] ?? ''
                return `${splitName} Snapshot deployed from ${this.event.data.sourceProject.name}`
            case this.event.event === 'project.snapshot.rolled-back':
                return `Snapshot Restored: ${this.event.data.snapshot.name}`
            case this.event.event === 'flows.set':
                return 'Flows Deployed From Editor'
            case this.event.event === 'project.snapshot.created':
                return `Snapshot Captured: ${this.event.data.snapshot.name}`
            case this.event.event === 'project.created':
                return 'Instance Created'
            case this.event.event === 'project.settings.updated':
                return 'Instance Settings Updated'
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
                return 'Snapshot Created'
            case this.event.event === 'project.created':
                return 'Instance Created'
            case this.event.event === 'project.settings.updated':
                return 'Settings Updated'
            default:
                return this.event.event
            }
        },
        isSnapshot () {
            return this.event.event === 'project.snapshot.created'
        }
    }
}
</script>

<style scoped lang="scss">
.event {

    .body {
        padding: 15px 0;
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
                font-size: 70%;
                opacity: 0.8;
            }
        }

        .username {
            color: $ff-grey-600;
        }
    }

    .actions {
        padding: 15px 10px;
    }

    &.is-snapshot {
        background: $ff-grey-100;
        color: $ff-grey-500;
    }
}
</style>
