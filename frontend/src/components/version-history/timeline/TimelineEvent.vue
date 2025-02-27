<template>
    <div
        class="event flex justify-between gap-1 items-center"
        :class="{'is-snapshot': isSnapshot, 'load-more': isLoadMore}"
        @click="loadMore"
    >
        <timeline-graph :event="event" :timeline="timeline" />

        <template v-if="!isLoadMore">
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
                <ff-kebab-menu v-if="snapshotExists" ref="kebab" menu-align="right">
                    <ff-list-item
                        :disabled="!hasPermission('project:snapshot:rollback')"
                        label="Restore Snapshot"
                        @click="$emit('restore-snapshot', event.data.snapshot)"
                    />
                    <ff-list-item
                        label="Edit Snapshot"
                        :disabled="!hasPermission('snapshot:edit')"
                        @click="$emit('edit-snapshot', event.data.snapshot)"
                    />
                    <ff-list-item
                        :disabled="!hasPermission('snapshot:full')"
                        label="View Snapshot"
                        @click="$emit('preview-snapshot', event.data.snapshot)"
                    />
                    <ff-list-item
                        :disabled="!hasPermission('project:snapshot:export')"
                        label="Download Snapshot"
                        @click="$emit('download-snapshot', event.data.snapshot)"
                    />
                    <ff-list-item
                        :disabled="!hasPermission('project:snapshot:read')"
                        label="Download package.json"
                        @click="$emit('download-package-json', event.data.snapshot)"
                    />
                    <ff-list-item
                        :disabled="!hasPermission('project:snapshot:set-target')"
                        label="Set as Device Target"
                        @click="$emit('set-device-target', event.data.snapshot)"
                    />
                    <ff-list-item
                        :disabled="!hasPermission('project:snapshot:delete')"
                        label="Delete Snapshot"
                        kind="danger"
                        @click="$emit('delete-snapshot', event.data.snapshot)"
                    />
                </ff-kebab-menu>
            </div>
        </template>

        <template v-else>
            <div class="body flex flex-1 justify-between gap-2 items-center cursor-pointer text-center">
                <h5 class="w-full">Load More</h5>
            </div>
        </template>
    </div>
</template>

<script>
import { defineComponent } from 'vue'

import permissionsMixin from '../../../mixins/Permissions.js'

import daysSince from '../../../utils/daysSince.js'

import TimelineGraph from './TimelineGraph.vue'

// eslint-disable-next-line vue/one-component-per-file
export default {
    name: 'TimelineEvent',
    components: { TimelineGraph },
    mixins: [permissionsMixin],
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
    emits: [
        'preview-snapshot',
        'restore-snapshot',
        'compare-snapshot',
        'download-snapshot',
        'download-package-json',
        'delete-snapshot',
        'edit-snapshot',
        'set-device-target',
        'load-more'
    ],
    computed: {
        createdAt () {
            return daysSince(this.event.createdAt, true)
        },
        title () {
            let name
            const data = this.event.data

            switch (this.event.event) {
            case 'project.snapshot.imported':
                name = data.snapshot.name.split(' - Deploy')[0] ?? ''

                if (Object.prototype.hasOwnProperty.call(data ?? {}, 'sourceProject')) {
                    // we can only differentiate between a plain snapshot import and a devops deployment history event
                    // by its data payload (i.e. if the event has a data.sourceProject attr, we know it's from a devops pipeline)

                    // eslint-disable-next-line vue/one-component-per-file
                    return defineComponent({
                        emits: ['preview-snapshot', 'preview-instance'],
                        methods: {
                            previewSnapshot () { this.$emit('preview-snapshot') },
                            previewInstance () { this.$emit('preview-instance') }
                        },
                        template: `
                        <span>
                            <a href="#" @click.prevent.stop="previewSnapshot">
                                ${name}
                            </a>
                            Snapshot deployed from
                            <a href="#" @click.stop.prevent="previewInstance">${this.event.data.sourceProject.name}</a>
                        </span>`
                    })
                }

                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    emits: ['preview-snapshot', 'preview-instance'],
                    methods: {
                        previewSnapshot () { this.$emit('preview-snapshot') },
                        previewInstance () { this.$emit('preview-instance') }
                    },
                    template: `
                        <span>
                            Imported
                            <a href="#" @click.prevent.stop="previewSnapshot">
                                ${name}
                            </a>
                            snapshot
                        </span>`
                })
            case 'project.snapshot.rolled-back':
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    emits: ['preview-snapshot'],
                    methods: {
                        previewSnapshot () { this.$emit('preview-snapshot') }
                    },
                    template: `
                        <span>
                            Snapshot Restored:
                            <a href="#" @click.stop.prevent="previewSnapshot">${data.snapshot.name}</a>
                        </span>`
                })
            case 'project.snapshot.created':
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    emits: ['preview-snapshot'],
                    methods: {
                        previewSnapshot () { this.$emit('preview-snapshot') }
                    },
                    template: `
                        <span>
                            Snapshot Captured:
                            <i v-if="${!data.info?.snapshotExists}">${data.snapshot.name}</i>
                            <a href="#" v-else @click.stop.prevent="previewSnapshot">${data.snapshot.name}</a>
                        </span>`
                })
            case 'flows.set':
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    template: '<span>Flows Deployed From Editor</span>'
                })
            case 'project.created':
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    template: '<span>Instance Created</span>'
                })
            case 'project.settings.updated':
            case 'device.settings.updated':
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    template: '<span>Settings Updated</span>'
                })
            case 'device.restarted':
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    template: '<span>Remote Instance restarted</span>'
                })
            case 'device.pipeline.deployed':
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    template: `<span>Flows deployed through the <i>${data.pipeline.name}</i> pipeline, applying the <i>${data.snapshot.name}</i> snapshot</span>`
                })
            case 'device.project.deployed':
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    template: `<span>Flows deployed through the <i>${data.project.name}</i> hosted instance, applying the <i>${data.snapshot.name}</i> snapshot</span>`
                })
            case 'device.snapshot.deployed':
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    template: `<span><i>${data.user.name}</i> manually deployed the <i>${data.snapshot.name}</i> snapshot</span>`
                })
            default:
                // eslint-disable-next-line vue/one-component-per-file
                return defineComponent({
                    template: `<span>${this.event.event}</span>`
                })
            }
        },
        shortTitle () {
            switch (this.event.event) {
            case 'project.snapshot.imported':
                if (Object.prototype.hasOwnProperty.call(this.event.data, 'sourceProject')) {
                    // we can only differentiate between a plain snapshot import and a devops deployment history events
                    // by its data payload (i.e. if the event has a data.sourceProject attr, we know it's from a devops pipeline)
                    return 'Pipeline Stage Pushed'
                } else return 'Snapshot Imported'
            case 'project.snapshot.rolled-back':
                return 'Snapshot Restored'
            case 'flows.set':
                return 'Flows Deployed'
            case 'project.snapshot.created':
                return 'Snapshot Created'
            case 'project.created':
                return 'Instance Created'
            case 'device.restarted':
                return 'Remote Instance Restarted'
            case ['project.settings.updated', 'device.settings.updated'].includes(this.event.event):
                return 'Settings Updated'
            case 'device.pipeline.deployed':
                return 'Pipeline deployment'
            case 'device.project.deployed':
                return 'Hosted instance deployment'
            case 'device.snapshot.deployed':
                return 'Snapshot deployment'
            default:
                return this.event.event
            }
        },
        isSnapshot () {
            // we can only differentiate between a plain snapshot import and a devops deployment history events
            // by its data payload (i.e. if the event has a data.sourceProject attr, we know it's from a devops pipeline)
            const isImportedSnapshot = this.event.event === 'project.snapshot.imported' &&
                !Object.prototype.hasOwnProperty.call(this.event.data, 'sourceProject')

            return this.event.event === 'project.snapshot.created' || isImportedSnapshot
        },
        snapshotExists () {
            return this.isSnapshot && this.event.data?.info?.snapshotExists
        },
        isLoadMore () {
            return this.event.event === 'load-more'
        }
    },
    methods: {
        openInstance () {
            this.$router.push({ name: 'instance-overview', params: { id: this.event.data.sourceProject.id } })
        },
        loadMore () {
            if (this.isLoadMore) this.$emit('load-more')
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

                i {
                    opacity: .5;
                }

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
        min-width: 40px;
    }

    &.is-snapshot {
        background: $ff-grey-100;
        color: $ff-grey-500;
    }

    &.load-more {
        background: $ff-grey-200;
        color: $ff-blue-500;
        cursor: pointer;
    }
}
</style>
