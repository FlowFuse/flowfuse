import InstanceApi from '../api/instances.js'
import alerts from '../services/alerts.js'
import Dialog from '../services/dialog.js'
import { InstanceStateMutator } from '../utils/InstanceStateMutator.js'

export default {
    methods: {
        showConfirmDeleteApplicationDialog () {
            this.$refs.confirmApplicationDeleteDialog.show(this.application)
        },
        async instanceStart (instance) {
            const mutator = new InstanceStateMutator(instance)
            mutator.setStateOptimistically('starting')
            try {
                await InstanceApi.startInstance(instance)
                mutator.setStateAsPendingFromServer()
            } catch (err) {
                console.warn('Instance start failed.', err)
                alerts.emit('Instance start failed.', 'warning')

                mutator.restoreState()
            }
        },
        async instanceRestart (instance) {
            const mutator = new InstanceStateMutator(instance)
            mutator.setStateOptimistically('restarting')
            try {
                await InstanceApi.restartInstance(instance)
                mutator.setStateAsPendingFromServer()
            } catch (err) {
                console.warn('Instance restart failed.', err)
                alerts.emit('Instance restart failed.', 'warning')

                mutator.restoreState()
            }
        },
        instanceShowConfirmSuspend (instance) {
            Dialog.show({
                header: 'Suspend Instance',
                text: `Are you sure you want to suspend ${instance.name}`,
                confirmLabel: 'Suspend',
                kind: 'danger'
            }, () => {
                const mutator = new InstanceStateMutator(instance)
                mutator.setStateOptimistically('suspending')

                InstanceApi.suspendInstance(instance).then(() => {
                    mutator.setStateAsPendingFromServer()

                    alerts.emit('Instance suspend request succeeded.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Instance failed to suspend.', 'warning')

                    mutator.restoreState()
                })
            })
        },
        instanceShowConfirmDelete (instance) {
            this.$refs.confirmInstanceDeleteDialog.show(instance)
        },
        onInstanceDeleted (instance) {
            if (this.applicationInstances.has(instance.id)) {
                this.applicationInstances.delete(instance.id)
            }
        },
        instanceUpdated: function (newData) {
            const mutator = new InstanceStateMutator(newData)
            mutator.clearState()

            this.applicationInstances.set(newData.id, {
                ...this.applicationInstances.get(newData.id),
                ...newData
            })
        }
    }
}
