import { mapActions, mapState } from 'vuex'

import dialog from '../services/dialog.js'

export default {
    computed: {
        ...mapState('ux/dialog', ['dialog'])
    },
    methods: {
        ...mapActions('ux/dialog', ['clearDialog']),
        ...mapActions('ux/dialog', {
            handleDialog: 'showDialogHandlers'
        }),
        showDialogHandler (msg, onConfirm, onCancel) {
            return this.handleDialog({
                payload: msg, onConfirm, onCancel
            })
        }
    },
    mounted () {
        dialog.bind(this.$refs.dialog, this.showDialogHandler)
    }
}
