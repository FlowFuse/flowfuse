<template>
    <div class="action-button">
        <DropdownMenu
            v-if="hasPermission('project:change-status')"
            buttonClass="ff-btn ff-btn--primary"
            :options="actionsDropdownOptions"
        >
            Actions
        </DropdownMenu>
        <ConfirmInstanceDeleteDialog
            ref="confirmInstanceDeleteDialog"
            :instance="instance"
            @click.stop
            @confirm="$emit('instance-deleted', instance)"
        />
    </div>
</template>

<script>
import { mapState } from 'vuex'

import InstanceApi from '../../api/instances.js'
import permissionsMixin from '../../mixins/Permissions.js'
import ConfirmInstanceDeleteDialog from '../../pages/instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import { InstanceStateMutator } from '../../utils/InstanceStateMutator.js'
import DropdownMenu from '../DropdownMenu.vue'

export default {
    name: 'InstanceActionsButton',
    components: { ConfirmInstanceDeleteDialog, DropdownMenu },
    mixins: [permissionsMixin],
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-deleted'],
    data () {
        return {
            instanceStateMutator: null
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        flowActionsDisabled () {
            return !(this.instance.meta && this.instance.meta.state !== 'suspended')
        },
        instanceStateChanging () {
            return !!this.instance.pendingStateChange || !!this.instance.optimisticStateChange
        },
        actionsDropdownOptions () {
            const result = [
                {
                    name: 'Start',
                    action: this.startInstance,
                    disabled: this.instanceStateChanging || this.instanceRunning
                },
                {
                    name: 'Restart',
                    action: this.restartInstance,
                    disabled: this.instanceStateChanging || this.flowActionsDisabled
                },
                {
                    name: 'Suspend',
                    class: ['text-red-700'],
                    action: this.showConfirmSuspendDialog,
                    disabled: this.instanceStateChanging || this.flowActionsDisabled
                }
            ]

            if (this.hasPermission('project:delete')) {
                result.push(null)
                result.push({ name: 'Delete', class: ['text-red-700'], action: this.showConfirmDeleteDialog })
            }

            return result
        },
        instanceRunning () {
            return this.instance?.meta?.state === 'running'
        }

    },
    watch: {
        instance: function () {
            this.instanceChanged()
        }
    },
    mounted () {
        this.instanceChanged()
    },
    methods: {
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
        instanceChanged () {
            this.instanceStateMutator = new InstanceStateMutator(this.instance)
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
        showConfirmDeleteDialog () {
            this.$refs.confirmInstanceDeleteDialog.show(this.instance)
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
        }

    }
}
</script>

<style scoped lang="scss">
.action-button {
  cursor: default;
}
</style>
