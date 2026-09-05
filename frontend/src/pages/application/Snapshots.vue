<template>
    <div data-el="application-snapshots">
        <div class="mb-3">
            <SectionTopMenu :hero="$t('ui.snapshots')" :help-header="$t('ui.flowfuseSnapshots')" :info="$t('ui.aListOfAllSnapshotsGeneratedByAnyInstanceOrDevic')">
                <template #pictogram>
                    <img alt="info" src="../../images/pictograms/snapshot_red.png">
                </template>
                <template #helptext>
                    <p>{{ $t('ui.snapshotsGenerateAPointInTimeBackupOfYourNodeRed') }}</p>
                    <p>Snapshots are also required for deploying to devices. In the Deployments page of a Project, you can define your “Target Snapshot”, which will then be deployed to all connected devices.</p>
                    <p>{{ $t('ui.youCanAlsoGenerateSnapshotsDirectlyFromAnyInstan') }} <a target="_blank" href="https://github.com/FlowFuse/nr-tools-plugin">{{ $t('ui.flowfuseNrToolsPlugin') }}</a></p>
                </template>
            </SectionTopMenu>
        </div>
        <ff-loading v-if="loading" :message="$t('ui.loadingSnapshots')" />
        <template v-if="snapshots.length > 0">
            <ff-data-table data-el="snapshots" class="space-y-4" :columns="columns" :rows="snapshotsFiltered" :show-search="true" :search-placeholder="$t('ui.searchSnapshots2')">
                <template #actions>
                    <DropdownMenu data-el="snapshot-filter" buttonClass="ff-btn ff-btn--secondary" :options="snapshotFilterOptions">
                        <FunnelIcon class="ff-btn--icon ff-btn--icon-left" aria-hidden="true" />
                        {{ snapshotFilter?.name || 'All Snapshots' }}
                        <span class="sr-only">{{ $t('ui.filterSnapshots') }}</span>
                    </DropdownMenu>
                </template>
                <template #context-menu="{row}">
                    <ff-kebab-item :disabled="!hasPermission('snapshot:edit', { application })" :label="$t('ui.editSnapshot')" @click="showEditSnapshotDialog(row)" />
                    <ff-kebab-item :disabled="!canViewSnapshot(row)" :label="$t('ui.viewSnapshot')" @click="showViewSnapshotDialog(row)" />
                    <ff-kebab-item :disabled="!canViewSnapshot(row)" :label="$t('ui.compareSnapshot')" @click="showCompareSnapshotDialog(row)" />
                    <ff-kebab-item :disabled="!canDownload(row)" :label="$t('ui.downloadSnapshot')" @click="showDownloadSnapshotDialog(row)" />
                    <ff-kebab-item :disabled="!canDownloadPackage(row)" :label="$t('ui.downloadPackageJson')" @click="downloadSnapshotPackage(row)" />
                    <ff-kebab-item :disabled="!canDelete(row)" :label="$t('ui.deleteSnapshot')" kind="danger" @click="showDeleteSnapshotDialog(row)" />
                </template>
            </ff-data-table>
        </template>
        <template v-else-if="!loading">
            <EmptyState>
                <template #img>
                    <img src="../../images/empty-states/instance-snapshots.png">
                </template>
                <template #header>{{ $t('ui.whatAreSnapshots') }}</template>
                <template #message>
                    <p>
                        {{ $t('ui.snapshotsArePointInTimeBackupsOfYourNodeRedInsta') }}
                    </p>
                    <p>
                        {{ $t('ui.snapshotsCanDeployedFromOneInstanceToAnotherThro') }}
                    </p>
                </template>
            </EmptyState>
        </template>
    </div>
    <SnapshotEditDialog ref="snapshotEditDialog" data-el="dialog-edit-snapshot" @snapshot-updated="onSnapshotEdit" />
    <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" />
    <AssetDetailDialog ref="snapshotViewerDialog" data-el="dialog-view-snapshot" />
    <AssetCompareDialog ref="snapshotCompareDialog" data-el="dialog-compare-snapshot" />
</template>

<script>
import { FunnelIcon } from '@heroicons/vue/24/outline'
import { markRaw } from 'vue'

import ApplicationApi from '../../api/application.js'
import SnapshotsApi from '../../api/snapshots.js'
import DropdownMenu from '../../components/DropdownMenu.vue'

import EmptyState from '../../components/EmptyState.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import AssetCompareDialog from '../../components/dialogs/AssetCompareDialog.vue'
import AssetDetailDialog from '../../components/dialogs/AssetDetailDialog.vue'
import SnapshotEditDialog from '../../components/dialogs/SnapshotEditDialog.vue'
import UserCell from '../../components/tables/cells/UserCell.vue'
import { downloadData } from '../../composables/Download.js'
import usePermissions from '../../composables/Permissions.js'
import { t } from '../../i18n.js'
import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import { applySystemUserDetails } from '../../transformers/snapshots.transformer.js'
import { isAutoSnapshot } from '../../utils/snapshot.js'

// Table Cells
import DaysSince from './Snapshots/components/cells/DaysSince.vue'
import SnapshotName from './Snapshots/components/cells/SnapshotName.vue'
import SnapshotSource from './Snapshots/components/cells/SnapshotSource.vue'
import SnapshotExportDialog from './Snapshots/components/dialogs/SnapshotExportDialog.vue'

export default {
    name: 'application-snapshots',
    components: {
        AssetDetailDialog,
        AssetCompareDialog,
        DropdownMenu,
        EmptyState,
        FunnelIcon,
        SectionTopMenu,
        SnapshotEditDialog,
        SnapshotExportDialog
    },
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            loading: false,
            snapshots: [],
            snapshotFilter: null,
            snapshotFilters: {
                All_Snapshots: {
                    name: 'All Snapshots',
                    selected: true,
                    filter: null,
                    action: () => {
                        this.snapshotFilters.All_Snapshots.selected = true
                        this.snapshotFilters.User_Snapshots.selected = false
                        this.snapshotFilters.Auto_Snapshots.selected = false
                        this.snapshotFilter = this.snapshotFilters.All_Snapshots
                    }
                },
                User_Snapshots: {
                    name: 'User Snapshots',
                    selected: false,
                    filter: (s) => !isAutoSnapshot(s),
                    action: () => {
                        this.snapshotFilters.All_Snapshots.selected = false
                        this.snapshotFilters.User_Snapshots.selected = true
                        this.snapshotFilters.Auto_Snapshots.selected = false
                        this.snapshotFilter = this.snapshotFilters.User_Snapshots
                    }
                },
                Auto_Snapshots: {
                    name: 'Auto Snapshots',
                    selected: false,
                    filter: (s) => isAutoSnapshot(s),
                    action: () => {
                        this.snapshotFilters.All_Snapshots.selected = false
                        this.snapshotFilters.User_Snapshots.selected = false
                        this.snapshotFilters.Auto_Snapshots.selected = true
                        this.snapshotFilter = this.snapshotFilters.Auto_Snapshots
                    }
                }
            },
            columns: [
                {
                    label: t('ui.snapshot'),
                    class: ['w-56 sm:w-48'],
                    component: {
                        is: markRaw(SnapshotName)
                    }
                },
                {
                    label: t('ui.source'),
                    class: ['w-56'],
                    key: '_ownerSortKey',
                    component: {
                        is: markRaw(SnapshotSource)
                    }
                },
                {
                    label: t('ui.createdBy'),
                    class: ['w-48 hidden md:table-cell'],
                    component: {
                        is: markRaw(UserCell),
                        map: {
                            avatar: 'user.avatar',
                            name: 'user.name',
                            username: 'user.username'
                        }
                    }
                },
                {
                    label: t('ui.dateCreated2'),
                    class: ['w-48 hidden sm:table-cell'],
                    component: { is: markRaw(DaysSince), map: { date: 'createdAt' } }
                }
            ]
        }
    },
    computed: {
        snapshotList () {
            return this.snapshots.map(s => {
                return {
                    label: s.name,
                    description: s.description || '',
                    value: s.id
                }
            })
        },
        snapshotsFiltered () {
            if (this.snapshotFilter?.filter) {
                return this.snapshots.filter(this.snapshotFilter.filter)
            }
            return this.snapshots
        },
        snapshotFilterOptions () {
            return Object.values(this.snapshotFilters)
        }
    },
    mounted () {
        this.loadSnapshots()
    },
    methods: {
        loadSnapshots: async function () {
            this.loading = true
            const data = await ApplicationApi.getSnapshots(this.application.id, null, null, null)
            this.snapshots = applySystemUserDetails(data.snapshots)
            this.loading = false
        },
        canViewSnapshot: function (row) {
            return this.hasPermission('snapshot:full', { application: this.application })
        },
        showViewSnapshotDialog (row) {
            SnapshotsApi.getFullSnapshot(row.id).then((data) => {
                this.$refs.snapshotViewerDialog.show(data)
            }).catch(err => {
                console.error(err)
                Alerts.emit('Failed to get snapshot.', 'warning')
            })
        },
        showCompareSnapshotDialog (snapshot) {
            SnapshotsApi.getFullSnapshot(snapshot.id)
                .then((data) => this.$refs.snapshotCompareDialog.show(data, this.snapshotList))
                .catch(err => {
                    console.error(err)
                    Alerts.emit('Failed to get snapshot.', 'warning')
                })
        },
        showDownloadSnapshotDialog (snapshot) {
            this.$refs.snapshotExportDialog.show(snapshot)
        },
        showEditSnapshotDialog (snapshot) {
            this.$refs.snapshotEditDialog.show(snapshot)
        },
        onSnapshotEdit (snapshot) {
            const index = this.snapshots.findIndex(s => s.id === snapshot.id)
            if (index >= 0) {
                this.snapshots[index].name = snapshot.name
                this.snapshots[index].description = snapshot.description
            }
        },
        async downloadSnapshotPackage (snapshot) {
            const ss = await SnapshotsApi.getSummary(snapshot.id)
            const owner = ss.device || ss.project
            const ownerType = ss.device ? 'device' : 'instance'
            const packageJSON = {
                name: `${owner.safeName || owner.name}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
                description: `${ownerType} snapshot, ${snapshot.name} - ${snapshot.description}`,
                private: true,
                version: '0.0.0-' + snapshot.id,
                dependencies: ss.modules || {}
            }
            downloadData(packageJSON, 'package.json')
        },
        // snapshot actions - delete
        showDeleteSnapshotDialog (snapshot) {
            Dialog.show({
                header: t('ui.deleteSnapshot'),
                text: t('ui.areYouSureYouWantToDeleteThisSnapshot'),
                kind: 'danger',
                confirmLabel: 'Delete'
            }, async () => {
                await SnapshotsApi.deleteSnapshot(snapshot.id)
                const index = this.snapshots.indexOf(snapshot)
                this.snapshots.splice(index, 1)
                Alerts.emit('Successfully deleted snapshot.', 'confirmation')
            })
        },
        isDevice: function (row) {
            return row.ownerType === 'device' || !!row.device
        },
        // enable/disable snapshot actions
        canDownload (_row) {
            return this.hasPermission('snapshot:export', { application: this.application })
        },
        canDownloadPackage (row) {
            if (this.isDevice(row)) {
                return this.hasPermission('device:snapshot:read', { application: this.application })
            }
            return this.hasPermission('project:snapshot:read', { application: this.application })
        },
        canDelete (row) {
            if (this.isDevice(row)) {
                return this.hasPermission('device:snapshot:delete', { application: this.application })
            }
            return this.hasPermission('project:snapshot:delete', { application: this.application })
        }
    }
}
</script>
