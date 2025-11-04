<template>
    <div class="action-button" data-el="action-button">
        <DropdownMenu
            v-if="hasPermission('project:change-status', { application: instance.application })"
            buttonClass="ff-btn ff-btn--primary ff-btn-icon"
            :options="actionsDropdownOptions"
        >
            <CogIcon class="ff-btn--icon ff-btn--icon-left" />
            <span class="actions-text-container">Actions</span>
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
import { CogIcon } from '@heroicons/vue/solid'

import InstanceApi from '../../api/instances.js'
import usePermissions from '../../composables/Permissions.js'
import ConfirmInstanceDeleteDialog from '../../pages/instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import { InstanceStateMutator } from '../../utils/InstanceStateMutator.js'
import DropdownMenu from '../DropdownMenu.vue'

export default {
    name: 'InstanceActionsButton',
    components: { CogIcon, ConfirmInstanceDeleteDialog, DropdownMenu },
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-deleted'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            instanceStateMutator: null
        }
    },
    computed: {
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

            if (this.hasPermission('project:delete', { application: this.instance.application })) {
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

// Container query for drawer context - responsive button behavior
// Breakpoint matches DRAWER_MOBILE_BREAKPOINT constant in Editor/index.vue
.actions-text-container {
  display: inline; // Default: show text
}

@container drawer (max-width: 639px) {
  // Hide text when drawer is narrow - icon-only mode
  .actions-text-container {
    display: none;
  }
}
</style>
