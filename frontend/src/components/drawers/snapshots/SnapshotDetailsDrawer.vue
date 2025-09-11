<template>
    <div id="snapshot-details-drawer">
        <div class="container">
            <section class="flow-viewer">
                <div class="header flex flex-row justify-between">
                    <span class="title font-bold">Flow:</span>
                    <span class="compare ff-link">compare...</span>
                </div>
                <flow-viewer v-if="flows.length" :flow="flows" />
            </section>

            <section v-if="snapshot.user" class="author">
                <div class="header flex flex-row justify-between">
                    <span class="title font-bold">Author:</span>
                </div>
                <div>
                    {{ snapshot.user.username }}
                </div>
            </section>

            <section v-if="snapshot.description" class="description">
                <div class="header flex flex-row justify-between">
                    <span class="title font-bold">Description:</span>
                </div>
                <p class="text-gray-600">
                    {{ snapshot.description }}
                </p>
            </section>

            <hr>

            <section v-if="snapshot.createdSince" class="date-created">
                <div class="header flex flex-row justify-between">
                    <span class="title font-bold">Date Created:</span>
                </div>
                <div class="flex gap-5">
                    <p class="text-gray-600">{{ snapshot.createdSince }}</p>
                </div>
            </section>
        </div>

        <section class="actions">
            <div class="header flex flex-row justify-between">
                <span class="title font-bold">Actions:</span>
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex flex-row gap-1">
                    <ff-button kind="secondary" class="flex-1">
                        Download Snapshot
                        <template #icon-left>
                            <DownloadIcon class="ff-icon" />
                        </template>
                    </ff-button>
                    <ff-button kind="secondary" class="flex-1">
                        Download package.json
                        <template #icon-left>
                            <DocumentDownloadIcon class="ff-icon" />
                        </template>
                    </ff-button>
                </div>
                <ff-button kind="secondary" class="flex-1">
                    Set as Device Target
                    <template #icon-left>
                        <DocumentDownloadIcon class="ff-icon" />
                    </template>
                </ff-button>
                <ff-button kind="secondary-danger" class="flex-1">
                    Delete Snapshot
                    <template #icon-left>
                        <TrashIcon class="ff-icon" />
                    </template>
                </ff-button>
            </div>
        </section>
    </div>
</template>

<script>
import { ClockIcon, DocumentDownloadIcon, DownloadIcon, PencilAltIcon, TrashIcon } from '@heroicons/vue/outline'
import { defineComponent } from 'vue'
import { mapActions } from 'vuex'

import SnapshotsApi from '../../../api/snapshots.js'
import FlowViewer from '../../flow-viewer/FlowViewer.vue'

export default defineComponent({
    name: 'SnapshotDetailsDrawer',
    components: {
        FlowViewer,
        DownloadIcon,
        DocumentDownloadIcon,
        TrashIcon
    },
    props: {
        snapshot: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            flows: []
        }
    },
    computed: {
        createdAt () {
            return this.snapshot.createdAt
        }
    },
    mounted () {
        this.setHeader()
        this.loadFlows()
            .catch(e => {
                console.warn('Error loading flows', e)
            })
    },
    methods: {
        ...mapActions('ux/drawers', ['setRightDrawerHeader']),
        setHeader () {
            return this.setRightDrawerHeader({
                title: this.snapshot.name,
                actions: [
                    {
                        label: 'Edit',
                        kind: 'secondary',
                        iconLeft: PencilAltIcon,
                        handler: () => console.log('edit')
                    },
                    {
                        label: 'Restore',
                        kind: 'primary',
                        iconLeft: ClockIcon,
                        handler: () => console.log('restore')
                    }
                ]
            })
        },
        loadFlows () {
            return SnapshotsApi.getFullSnapshot(this.snapshot.id)
                .then(flows => {
                    this.flows = flows.flows.flows
                })
        }
    }
})
</script>

<style scoped lang="scss">
#snapshot-details-drawer {
    flex: 1;

    &, .container {
        display: flex;
        flex-direction: column;
        gap: 15px;
        overflow: auto;
    }

    .description {
        p {
            white-space: break-spaces;
        }
    }

    .flow-viewer {
        .wrapper {
            max-height: 250px;
            overflow: auto;
        }
    }
}
</style>
