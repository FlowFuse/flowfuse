<template>
    <ff-dialog
        ref="dialog"
        header-variant="light"
        :show-actions="false"
        box-class="snapshot-details-modal"
        style="z-index: 100"
    >
        <template #header>
            <h2 class="modal-title" :title="headerTitle">{{ headerTitle }}</h2>
            <div class="modal-actions">
                <ff-button
                    v-for="(action, $key) in visibleActions"
                    :key="action.label + $key"
                    :kind="action.kind ?? 'secondary'"
                    :disabled="typeof action.disabled === 'function' ? action.disabled() : action.disabled"
                    :has-left-icon="!!action.iconLeft"
                    v-bind="action.bind ?? {}"
                    :title="typeof action.tooltip === 'function' ? action.tooltip() : (action.tooltip ?? '')"
                    @click="action.handler"
                >
                    <template v-if="!!action.iconLeft" #icon-left>
                        <component :is="action.iconLeft" />
                    </template>
                    {{ action.label }}
                </ff-button>
                <button
                    type="button"
                    class="modal-close-btn"
                    aria-label="Close"
                    @click="close"
                >
                    <XIcon class="ff-icon" />
                </button>
            </div>
        </template>
        <SnapshotDetailsDrawer
            v-if="snapshot"
            :snapshot="snapshot"
            :snapshot-list="snapshotList"
            :instance="instance"
            :can-set-device-target="canSetDeviceTarget"
            :can-restore="canRestore"
            :can-restore-reason="canRestoreReason"
            :is-device="isDevice"
            :is-device-dev-mode="isDeviceDevMode"
            header-mode="modal"
            @header-changed="onHeaderChanged"
            @updated-snapshot="$emit('updated-snapshot', $event)"
            @restored-snapshot="$emit('restored-snapshot', $event)"
            @deleted-snapshot="onDeletedSnapshot"
        />
    </ff-dialog>
</template>

<script>
import { XIcon } from '@heroicons/vue/solid'

import SnapshotDetailsDrawer from '../drawers/snapshots/SnapshotDetailsDrawer.vue'

export default {
    name: 'SnapshotDetailsModal',
    components: {
        SnapshotDetailsDrawer,
        XIcon
    },
    emits: ['updated-snapshot', 'restored-snapshot', 'deleted-snapshot'],
    setup () {
        return {
            show (snapshot, snapshotList, instance, opts = {}) {
                this.snapshot = snapshot
                this.snapshotList = snapshotList
                this.instance = instance
                this.canSetDeviceTarget = opts.canSetDeviceTarget ?? true
                this.canRestore = opts.canRestore ?? true
                this.canRestoreReason = opts.canRestoreReason ?? ''
                this.isDevice = opts.isDevice ?? false
                this.isDeviceDevMode = opts.isDeviceDevMode ?? false
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            snapshot: null,
            snapshotList: null,
            instance: null,
            canSetDeviceTarget: true,
            canRestore: true,
            canRestoreReason: '',
            isDevice: false,
            isDeviceDevMode: false,
            headerConfig: null
        }
    },
    computed: {
        headerTitle () {
            return this.headerConfig?.title ?? this.snapshot?.name ?? ''
        },
        visibleActions () {
            return (this.headerConfig?.actions ?? []).filter(action => {
                if (typeof action.hidden === 'function') return !action.hidden()
                return !action.hidden
            })
        }
    },
    methods: {
        close () {
            this.$refs.dialog.close()
            this.snapshot = null
            this.headerConfig = null
        },
        onHeaderChanged (headerConfig) {
            this.headerConfig = headerConfig
        },
        onDeletedSnapshot (snapshot) {
            this.$emit('deleted-snapshot', snapshot)
            this.close()
        }
    }
}
</script>

<style scoped lang="scss">
// ff-dialog-box has overflow: auto on the whole box — override so only the
// body scrolls and the header stays pinned.
:deep(.snapshot-details-modal) {
    overflow: hidden;
}

.modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
}

.modal-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

.modal-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    color: inherit;

    &:hover {
        background: $ff-grey-100;
    }
}
</style>
