<template>
    <ff-dialog :open="isOpen" header="Set Device Target Snapshot">
        <template v-slot:default>
            <p>Are you sure you want to set this snapshot as the device target?</p>
            <p>All devices in this team will be restarted on this snapshot.</p>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="primary" class="ml-4" @click="confirm()">Set Target</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

import alerts from '@/services/alerts'

export default {
    name: 'ConfirmSnapshotTargetDialog',
    data () {
        return {
            snapshot: null
        }
    },
    methods: {
        confirm () {
            this.$emit('targetSnapshot', this.snapshot)
            alerts.emit('Successfully set snapshot as device target.', 'confirmation')
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
            }
        }
    }
}
</script>
