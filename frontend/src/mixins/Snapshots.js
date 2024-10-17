import InstanceApi from '../api/instances.js'
import SnapshotApi from '../api/projectSnapshots.js'
import SnapshotsApi from '../api/snapshots.js'
import { downloadData } from '../composables/Download.js'
import Alerts from '../services/alerts.js'
import Dialog from '../services/dialog.js'
import Product from '../services/product.js'

export default {
    methods: {
        showViewSnapshotDialog (snapshot) {
            Product.capture('ff-snapshot-view', {
                'snapshot-id': snapshot.id
            }, {
                instance: this.instance?.id
            })
            SnapshotsApi.getFullSnapshot(snapshot.id).then((data) => {
                this.$refs.snapshotViewerDialog.show(data)
            }).catch(err => {
                console.error(err)
                Alerts.emit('Failed to get snapshot.', 'warning')
            })
        },
        // snapshot actions - rollback
        showRollbackDialog (snapshot) {
            return new Promise((resolve) => {
                Dialog.show({
                    header: 'Restore Snapshot',
                    kind: 'danger',
                    text: `This will overwrite the current instance.
                       All changes to the flows, settings and environment variables made since the last snapshot will be lost.
                       Are you sure you want to deploy to this snapshot?`,
                    confirmLabel: 'Confirm'
                }, async () => {
                    await SnapshotApi.rollbackSnapshot(this.instance.id, snapshot.id)
                    Alerts.emit('Successfully deployed snapshot.', 'confirmation')
                    resolve()
                })
            })
        },
        showCompareSnapshotDialog (snapshot) {
            Product.capture('ff-snapshot-compare', {
                'snapshot-id': snapshot.id
            }, {
                instance: this.instance?.id
            })
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
        async downloadSnapshotPackage (snapshot) {
            Product.capture('ff-snapshot-download', {
                'snapshot-id': snapshot.id
            }, {
                instance: this.instance?.id
            })
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
            return new Promise((resolve) => {
                Dialog.show({
                    header: 'Delete Snapshot',
                    text: 'Are you sure you want to delete this snapshot?',
                    kind: 'danger',
                    confirmLabel: 'Delete'
                }, async () => {
                    await SnapshotsApi.deleteSnapshot(snapshot.id)
                    if (this.snapshots) {
                        const index = this.snapshots.indexOf(snapshot)
                        this.snapshots.splice(index, 1)
                    }
                    Alerts.emit('Successfully deleted snapshot.', 'confirmation')
                    resolve()
                })
            })
        },
        showEditSnapshotDialog (snapshot) {
            this.$refs.snapshotEditDialog.show(snapshot)
        },
        // snapshot actions - set as device target
        showDeviceTargetDialog (snapshot) {
            Dialog.show({
                header: 'Set Device Target Snapshot',
                text: `Are you sure you want to set this snapshot as the device target?
                       All devices assigned to this instance will be restarted on this snapshot.`,
                confirmLabel: 'Set Target'
            }, async () => {
                await InstanceApi.updateInstanceDeviceSettings(this.instance.id, {
                    targetSnapshot: snapshot.id
                })
                Alerts.emit('Successfully set device target.', 'confirmation')
                this.$emit('instance-updated')
            })
        }
    }
}
