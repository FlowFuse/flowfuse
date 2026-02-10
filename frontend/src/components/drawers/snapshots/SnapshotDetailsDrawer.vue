<template>
    <div id="snapshot-details-drawer" data-el="snapshot-details-drawer" class="p-4">
        <div class="container">
            <section
                v-if="hasPermission('snapshot:full', applicationContext)"
                class="flow-viewer flex flex-1 flex-col overflow-auto"
                data-el="flows"
            >
                <div class="header flex flex-row justify-between mb-2">
                    <span class="title font-bold">Flows:</span>
                    <span
                        class="compare ff-link" data-action="compare-snapshot"
                        @click="showCompareSnapshotDialog(snapshot)"
                    >
                        compare...
                    </span>
                </div>
                <information-well
                    class="flex-grow-1 min-h-0 flex-col !mb-2"
                    :class="{['items-center justify-center']: !flows.length}"
                >
                    <flow-viewer v-if="flows.length" :flow="flows" />
                    <span v-else class="text-gray-400">No flows found</span>
                </information-well>
            </section>

            <div class="flex flex-col flex-1 gap-4">
                <section class="name">
                    <div class="header flex flex-row justify-between">
                        <span class="title font-bold">Name:</span>
                    </div>
                    <p v-if="!isEditing" class="text-gray-600">
                        {{ snapshot.name }}
                    </p>
                    <FormRow
                        v-else
                        v-model="input.name"
                        data-form="snapshot-name"
                        container-class="max-w-full"
                        :error="errors.name"
                    />
                </section>

                <section v-if="snapshot.user" class="author">
                    <div class="header flex flex-row justify-between">
                        <span class="title font-bold">Author:</span>
                    </div>
                    <div>
                        {{ snapshot.user.username }}
                    </div>
                </section>

                <section class="description">
                    <div class="header flex flex-row justify-between">
                        <span class="title font-bold">Description:</span>
                    </div>
                    <p v-if="!isEditing" class="text-gray-600">
                        {{ snapshot.description.length > 0 ? snapshot.description : 'No description provided' }}
                    </p>
                    <FormRow v-else data-form="snapshot-description" container-class="max-w-full" :error="errors.description">
                        <template #input>
                            <textarea
                                v-model="input.description"
                                rows="8"
                                class="ff-input ff-text-input"
                                style="height: auto"
                            />
                        </template>
                    </FormRow>
                </section>

                <section v-if="snapshot.createdSince" class="date-created">
                    <div class="header flex flex-row justify-between">
                        <span class="title font-bold">Date Created:</span>
                    </div>
                    <div class="flex gap-5">
                        <p class="text-gray-600">{{ snapshot.createdSince }}</p>
                    </div>
                </section>
            </div>
        </div>

        <div>
            <hr class="w-1/2 mx-auto">
        </div>

        <section class="actions flex flex-col gap-3">
            <div class="header flex flex-row justify-between">
                <span class="title font-bold">Actions:</span>
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex flex-row gap-1">
                    <ff-button
                        kind="secondary" class="flex-1"
                        :disabled="!hasPermission('project:snapshot:export', applicationContext)"
                        data-action="download-snapshot"
                        @click="showDownloadSnapshotDialog(snapshot)"
                    >
                        Download Snapshot
                        <template #icon-left>
                            <DownloadIcon class="ff-icon" />
                        </template>
                    </ff-button>
                    <ff-button
                        kind="secondary" class="flex-1"
                        :disabled="!hasPermission('project:snapshot:read', applicationContext)"
                        data-action="download-package-json"
                        @click="downloadSnapshotPackage(snapshot)"
                    >
                        Download package.json
                        <template #icon-left>
                            <DocumentDownloadIcon class="ff-icon" />
                        </template>
                    </ff-button>
                </div>
                <ff-button
                    v-if="canSetDeviceTarget"
                    kind="secondary"
                    class="flex-1"
                    :disabled="!hasPermission('project:snapshot:set-target', applicationContext)"
                    data-action="set-as"
                    @click="showDeviceTargetDialog(snapshot)"
                >
                    Set as Device Target
                    <template #icon-left>
                        <ChipIcon class="ff-icon" />
                    </template>
                </ff-button>
                <ff-button
                    kind="secondary-danger"
                    class="flex-1"
                    :disabled="!hasPermission('project:snapshot:delete', applicationContext)"
                    data-action="delete"
                    @click="showDeleteSnapshotDialog(snapshot)"
                >
                    Delete Snapshot
                    <template #icon-left>
                        <TrashIcon class="ff-icon" />
                    </template>
                </ff-button>
            </div>
        </section>
        <AssetCompareDialog ref="snapshotCompareDialog" data-el="dialog-compare-snapshot" />
        <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" />
    </div>
</template>

<script>
import {
    ChipIcon,
    ClockIcon,
    DocumentDownloadIcon,
    DownloadIcon,
    PencilAltIcon,
    SaveAsIcon,
    TrashIcon
} from '@heroicons/vue/outline'
import { defineComponent } from 'vue'
import { mapActions } from 'vuex'

import DeviceApi from '../../../api/devices.js'

import snapshotsApi from '../../../api/snapshots.js'
import usePermissions from '../../../composables/Permissions.js'
import snapshotsMixin from '../../../mixins/Snapshots.js'
import SnapshotExportDialog from '../../../pages/application/Snapshots/components/dialogs/SnapshotExportDialog.vue'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'
import FormRow from '../../FormRow.vue'
import AssetCompareDialog from '../../dialogs/AssetCompareDialog.vue'
import FlowViewer from '../../flow-viewer/FlowViewer.vue'
import InformationWell from '../../wells/InformationWell.vue'

export default defineComponent({
    name: 'SnapshotDetailsDrawer',
    components: {
        InformationWell,
        FormRow,
        AssetCompareDialog,
        ChipIcon,
        FlowViewer,
        DownloadIcon,
        DocumentDownloadIcon,
        SnapshotExportDialog,
        TrashIcon
    },
    mixins: [snapshotsMixin],
    props: {
        canSetDeviceTarget: {
            type: Boolean,
            required: false,
            default: true
        },
        canRestore: {
            type: Boolean,
            required: false,
            default: true
        },
        canRestoreReason: {
            type: String,
            required: false,
            default: ''
        },
        instance: {
            type: Object,
            required: false,
            default: null
        },
        isDevice: {
            type: Boolean,
            required: false,
            default: false
        },
        isDeviceDevMode: {
            type: Boolean,
            required: false,
            default: false
        },
        snapshot: {
            type: Object,
            required: true
        },
        snapshotList: {
            type: Object,
            required: true
        }
    },
    emits: ['restored-snapshot', 'updated-snapshot', 'deleted-snapshot'],
    setup () {
        const { hasPermission } = usePermissions()

        return {
            hasPermission
        }
    },
    data () {
        return {
            flows: [],
            isEditing: false,
            input: {
                name: '',
                description: ''
            },
            errors: {
                name: '',
                description: ''
            }
        }
    },
    computed: {
        createdAt () {
            return this.snapshot.createdAt
        },
        hasChanges () {
            const hasTitleChanged = this.input.name !== this.snapshot.name
            const hasDescriptionChanged = this.input.description !== this.snapshot.description

            return hasDescriptionChanged || hasTitleChanged
        },
        applicationContext () {
            return this.instance?.application ? { application: this.instance.application } : {}
        }
    },
    watch: {
        isEditing (isEditing) {
            if (!isEditing) {
                this.input.description = this.snapshot.description
                this.input.name = this.snapshot.name
            }
        },
        snapshot: {
            deep: true,
            handler: 'setHeader'
        }
    },
    mounted () {
        this.input.name = this.snapshot.name
        this.input.description = this.snapshot.description
        this.setHeader()
        this.loadFlows()
            .catch(e => {
                console.warn('Error loading flows', e)
            })
    },
    methods: {
        ...mapActions('ux/drawers', ['setRightDrawerHeader']),
        deployDeviceSnapshot () {
            const snapshot = this.snapshot
            const currentTargetSnapshot = this.instance.targetSnapshot?.id

            if (typeof currentTargetSnapshot === 'string' && currentTargetSnapshot === snapshot.id) {
                Alerts.emit('This snapshot is already deployed to this remote instance.', 'info', 7500)
                return
            }

            let body = `Are you sure you want to restore snapshot '${snapshot.name}' to this remote instance?`
            if (snapshot.device?.id !== this.instance.id) {
                body = `Snapshot '${snapshot.name}' was not generated by this remote instance. Are you sure you want to deploy it to this remote instance?`
            }
            if (this.isDevice && this.isDeviceDevMode) {
                body += `
                        Any changes made to the remote instance whilst in developer mode will be lost.
                        To avoid losses, you can cancel this operation and create a snapshot in the developer mode tab.`
            }

            Dialog.show({
                header: `Restore Snapshot to remote instance '${this.instance.name}'`,
                kind: 'danger',
                text: body,
                confirmLabel: 'Confirm'
            }, async () => {
                try {
                    await DeviceApi.setSnapshotAsTarget(this.instance.id, snapshot.id)
                    Alerts.emit('Successfully applied the snapshot.', 'confirmation')
                    this.$emit('restored-snapshot', this.snapshot)
                } catch (err) {
                    Alerts.emit('Failed to apply snapshot: ' + err.toString(), 'warning', 7500)
                }
            })
        },
        setHeader () {
            const context = this
            return this.setRightDrawerHeader({
                title: this.snapshot.name,
                actions: [
                    {
                        label: 'Discard',
                        kind: 'secondary',
                        handler: () => {
                            this.isEditing = false
                        },
                        hidden: function () {
                            if (!context.hasPermission('snapshot:edit', context.applicationContext)) return true

                            return !context.isEditing
                        },
                        bind: {
                            'data-action': 'discard'
                        }
                    },
                    {
                        label: 'Edit',
                        kind: 'secondary',
                        iconLeft: PencilAltIcon,
                        handler: () => {
                            this.isEditing = !this.isEditing
                        },
                        hidden: function () {
                            if (!context.hasPermission('snapshot:edit', context.applicationContext)) return true
                            if (context.isEditing) return true

                            return context.hasChanges
                        },
                        bind: {
                            'data-action': 'edit'
                        }
                    },
                    {
                        label: 'Save',
                        kind: 'primary',
                        iconLeft: SaveAsIcon,
                        handler: () => {
                            context.saveSnapshot()
                        },
                        hidden: function () {
                            return !context.isEditing
                        },
                        disabled: function () {
                            return !context.hasChanges
                        },
                        bind: {
                            'data-action': 'save'
                        }
                    },
                    {
                        label: 'Restore',
                        kind: 'primary',
                        iconLeft: ClockIcon,
                        handler: () => this.isDevice ? this.deployDeviceSnapshot(this.snapshot.id) : this.showRollbackDialog(this.snapshot),
                        hidden: function () {
                            if (context.isEditing) {
                                return true
                            }
                            return !context.hasPermission('project:snapshot:rollback', context.applicationContext)
                        },
                        disabled: function () {
                            return !context.canRestore
                        },
                        tooltip: function () {
                            return context.canRestoreReason || ''
                        },
                        bind: {
                            'data-action': 'restore'
                        }
                    }
                ]
            })
        },
        loadFlows () {
            return snapshotsApi.getFullSnapshot(this.snapshot.id)
                .then(flows => {
                    this.flows = flows.flows.flows
                })
        },
        saveSnapshot () {
            if (this.validate()) {
                // this.submitted = true
                const opts = {
                    name: this.input.name,
                    description: this.input.description || ''
                }
                snapshotsApi.updateSnapshot(this.snapshot.id, opts).then((data) => {
                    // todo find a better way of updating the snapshot
                    // eslint-disable-next-line vue/no-mutating-props
                    this.snapshot.name = this.input.name
                    // eslint-disable-next-line vue/no-mutating-props
                    this.snapshot.description = this.input.description
                    Alerts.emit('Snapshot updated.', 'confirmation')
                    this.$emit('updated-snapshot', this.snapshot)
                }).catch(err => {
                    console.error(err)
                    Alerts.emit('Failed to update snapshot.', 'warning')
                }).finally(() => {
                    this.isEditing = false
                })
            }
        },
        validate () {
            if (!this.input.name) {
                this.errors.name = 'Name is required'
            } else {
                this.errors.name = ''
            }
            return !!(this.input.name) && !this.errors.name
        }
    }
})
</script>

<style scoped lang="scss">
#snapshot-details-drawer {
    flex: 1;

    &, .container {
        flex: 1;
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
