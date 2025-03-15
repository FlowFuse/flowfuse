import { mapState } from 'vuex'

import InstanceApi from '../api/instances.js'
import SnapshotApi from '../api/projectSnapshots.js'
import alerts from '../services/alerts.js'
import Dialog from '../services/dialog.js'
import { InstanceStateMutator } from '../utils/InstanceStateMutator.js'
import { Roles } from '../utils/roles.js'

import permissionsMixin from './Permissions.js'

export default {
    mixins: [permissionsMixin],
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
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
                    name: 'page-not-found',
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
        onInstanceDelete () {
            this.$router.push({
                name: 'ApplicationInstances',
                params: { id: this.instance.application.id, team_slug: this.team.slug }
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
