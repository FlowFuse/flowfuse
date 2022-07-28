<template>
    <ff-dialog :open="isOpen" header="Delete Snapshot">
        <template v-slot:default>
            Are you sure you want to delete this snapshot?
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="danger" class="ml-4" @click="confirm()">Delete</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

import alerts from '@/services/alerts'

export default {
    name: 'ConfirmSnapshotDeleteDialog',
    data () {
        return {
            snapshot: null
        }
    },
    methods: {
        confirm () {
            this.$emit('deleteSnapshot', this.snapshot)
            alerts.emit('Successfully deleted snapshot.', 'confirmation')
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
