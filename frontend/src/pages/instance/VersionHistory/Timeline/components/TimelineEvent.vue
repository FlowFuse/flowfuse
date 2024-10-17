<template>
    <div class="event flex justify-between gap-1 items-center" :class="{'is-snapshot': isSnapshot}">
        <timeline-graph :event="event" :timeline="timeline" />

        <div class="body flex flex-1 justify-between gap-2 items-center">
            <div class="content flex flex-1 flex-col justify-start">
                <component
                    :is="title"
                    class="title"
                    @preview-snapshot="$emit('preview-snapshot', event.data.snapshot)"
                    @preview-instance="openInstance"
                />
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
import { defineComponent } from 'vue'

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
    emits: ['preview-snapshot'],
    computed: {
        createdAt () {
            return daysSince(this.event.createdAt, true)
        },
        title () {
            switch (true) {
            case this.event.event === 'project.snapshot.imported':
                // eslint-disable-next-line no-case-declarations
                const splitName = this.event.data.snapshot.name.split(' - Deploy')[0] ?? ''
                return defineComponent({
                    emits: ['preview-snapshot', 'preview-instance'],
                    methods: {
                        previewSnapshot () { this.$emit('preview-snapshot') },
                        previewInstance () { this.$emit('preview-instance') }
                    },
                    template: `
                        <span>
                            <a href="#" @click.prevent.stop="previewSnapshot">
                                ${splitName}
                            </a>
                            Snapshot deployed from
                            <a href="#" @click.stop.prevent="previewInstance">${this.event.data.sourceProject.name}</a>
                        </span>`
                })

            case this.event.event === 'project.snapshot.rolled-back':
                return defineComponent({
                    emits: ['preview-snapshot'],
                    methods: {
                        previewSnapshot () { this.$emit('preview-snapshot') }
                    },
                    template: `
                        <span>
                            Snapshot Restored:
                            <a href="#" @click.stop.prevent="previewSnapshot">${this.event.data.snapshot.name}</a>
                        </span>`
                })
            case this.event.event === 'project.snapshot.created':
                return defineComponent({
                    emits: ['preview-snapshot'],
                    methods: {
                        previewSnapshot () { this.$emit('preview-snapshot') }
                    },
                    template: `
                        <span>
                            Snapshot Captured:
                            <i v-if="${!this.event.data.info.snapshotExists}">${this.event.data.snapshot.name}</i>
                            <a href="#" v-else @click.stop.prevent="previewSnapshot">${this.event.data.snapshot.name}</a>
                        </span>`
                })
            case this.event.event === 'flows.set':
                return defineComponent({
                    template: '<span>Flows Deployed From Editor</span>'
                })
            case this.event.event === 'project.created':
                return defineComponent({
                    template: '<span>Instance Created</span>'
                })
            case this.event.event === 'project.settings.updated':
                return defineComponent({
                    template: '<span>Instance Settings Updated</span>'
                })
            default:
                return defineComponent({
                    template: `<span>${this.event.event}</span>`
                })
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
    },
    methods: {
        openInstance () {
            this.$router.push({ name: 'instance-overview', params: { id: this.event.data.sourceProject.id } })
        }
    }
}
</script>

<style lang="scss">
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

                a {
                    color: $ff-blue-600;
                }
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
