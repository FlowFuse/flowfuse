<template>
    <ff-dialog :open="isOpen" header="Rollback Snapshot">
        <template v-slot:default>
            <p>This rollback will overwrite the current project.</p>
            <p>All changes to the flows, settings and environment variables made since
                the last snapshot will be lost.</p>
            <p>Are you sure you want to rollback to this snapshot?</p>
        </template>
        <template v-slot:actions>
            <ff-button ref="cancel" kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="primary" class="ml-4" @click="confirm()">Confirm Rollback</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

export default {
    name: 'ConfirmSnapshotRollbackDialog',
    data () {
        return {
            snapshot: null
        }
    },
    methods: {
        confirm () {
            this.$emit('rollbackSnapshot', this.snapshot)
            this.isOpen = false
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show (snapshot) {
                this.snapshot = snapshot
                isOpen.value = true
                this.$refs.cancel.$el.focus()
            }
        }
    }
}
</script>
