import dialog from '../services/dialog.js'

import { useUxDialogStore } from '@/stores/ux-dialog.js'

export default {
    computed: {
        dialog () { return useUxDialogStore().dialog }
    },
    methods: {
        clearDialog (cancelled = false) {
            useUxDialogStore().clearDialog(cancelled)
        },
        showDialogHandler (msg, onConfirm, onCancel) {
            return useUxDialogStore().showDialogHandlers({ payload: msg, onConfirm, onCancel })
        }
    },
    mounted () {
        dialog.bind(this.$refs.dialog, this.showDialogHandler)
    }
}
