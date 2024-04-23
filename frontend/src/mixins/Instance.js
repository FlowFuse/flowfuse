import { mapState } from 'vuex'

import { Roles } from '../../../forge/lib/roles.js'
import InstanceApi from '../api/instances.js'
import SnapshotApi from '../api/projectSnapshots.js'

import alerts from '../services/alerts.js'
import Dialog from '../services/dialog.js'
import { InstanceStateMutator } from '../utils/InstanceStateMutator.js'

import permissionsMixin from './Permissions.js'

export default {
    mixins: [permissionsMixin],
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        actionsDropdownOptions () {
            const flowActionsDisabled = !(this.instance.meta && this.instance.meta.state !== 'suspended')

            const instanceStateChanging = this.instance.pendingStateChange || this.instance.optimisticStateChange

            const result = [
                {
                    name: 'Start',
                    action: this.startInstance,
                    disabled: instanceStateChanging || this.instanceRunning
                },
                { name: 'Restart', action: this.restartInstance, disabled: instanceStateChanging || flowActionsDisabled },
                { name: 'Suspend', class: ['text-red-700'], action: this.showConfirmSuspendDialog, disabled: instanceStateChanging || flowActionsDisabled }
            ]

            if (this.hasPermission('project:delete')) {
                result.push(null)
                result.push({ name: 'Delete', class: ['text-red-700'], action: this.showConfirmDeleteDialog })
            }

            return result
        },
        instanceRunning () {
            return this.instance?.meta?.state === 'running'
        },
        isVisitingAdmin: function () {
            return this.teamMembership?.role === Roles.Admin
        },
        isHA () {
            return this.instance?.ha?.replicas !== undefined
        }
    },
    data () {
        return {
            instance: {},
            loading: {
                deleting: false,
                suspend: false
            }
        }
    },
    watch: {
        instance: 'instanceChanged'
    },
    methods: {
        showConfirmDeleteDialog () {
            this.$refs.confirmInstanceDeleteDialog.show(this.instance)
        },
        showConfirmSuspendDialog () {
            Dialog.show({
                header: 'Suspend Instance',
                text: 'Are you sure you want to suspend this instance?',
                confirmLabel: 'Suspend',
                kind: 'danger'
            }, () => {
                this.instanceStateMutator.setStateOptimistically('suspending')
                InstanceApi.suspendInstance(this.instance).then(() => {
                    this.instanceStateMutator.setStateAsPendingFromServer()
                    alerts.emit('Instance suspend request succeeded.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Instance failed to suspend.', 'warning')
                    this.instanceStateMutator.restoreState()
                })
            })
        },
        async loadInstance () {
            const instanceId = this.$route.params.id
            if (!instanceId) {
                return
            }
            try {
                const data = await InstanceApi.getInstance(instanceId)
                this.instance = { ...{ deviceSettings: {} }, ...this.instance, ...data }
                this.$store.dispatch('account/setTeam', this.instance.team.slug)
                this.instance.deviceSettings = await InstanceApi.getInstanceDeviceSettings(instanceId)
                if (this.instance.deviceSettings?.targetSnapshot) {
                    this.instance.targetSnapshot = await SnapshotApi.getSnapshot(instanceId, this.instance.deviceSettings.targetSnapshot)
                } else {
                    this.instance.targetSnapshot = null
                }
            } catch (err) {
                this.$router.push({
                    name: 'PageNotFound',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
            }
        },
        instanceUpdated (newData) {
            this.instanceStateMutator.clearState()
            this.instance = { ...this.instance, ...newData }
        },
        instanceChanged () {
            this.instanceStateMutator = new InstanceStateMutator(this.instance)
        },
        async startInstance () {
            this.instanceStateMutator.setStateOptimistically('starting')

            try {
                await InstanceApi.startInstance(this.instance)
                this.instanceStateMutator.setStateAsPendingFromServer()
            } catch (err) {
                console.warn('Instance start failed.', err)
                alerts.emit('Instance start failed.', 'warning')
                this.instanceStateMutator.restoreState()
            }
        },
        async restartInstance () {
            this.instanceStateMutator.setStateOptimistically('restarting')
            try {
                await InstanceApi.restartInstance(this.instance)
                this.instanceStateMutator.setStateAsPendingFromServer()
            } catch (err) {
                console.warn('Instance restart failed.', err)
                alerts.emit('Instance restart failed.', 'warning')
                this.instanceStateMutator.restoreState()
            }
        },
        deleteInstance () {
            const applicationId = this.instance.application.id
            this.loading.deleting = true
            InstanceApi.deleteInstance(this.instance)
                .then(() => this.$router.push({ name: 'ApplicationInstances', params: { id: applicationId } }))
                .then(() => alerts.emit('Instance successfully deleted.', 'confirmation'))
                .catch(err => {
                    console.warn(err)
                    alerts.emit('Instance failed to delete.', 'warning')
                    this.loading.deleting = false
                })
        }
    },
    async created () {
        await this.loadInstance()

        this.$watch(
            () => this.$route.params.id,
            async () => {
                await this.loadInstance()
            }
        )
    }
}
