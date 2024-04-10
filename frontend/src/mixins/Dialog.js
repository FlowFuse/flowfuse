import dialog from '../services/dialog.js'

export default {
    data () {
        return {
            dialog: {
                header: null,
                text: null,
                html: null,
                confirmLabel: null,
                kind: null,
                onConfirm: null,
                onCancel: null
            }
        }
    },
    methods: {
        clearDialog (cancelled) {
            if (cancelled) {
                this.dialog.onCancel?.()
            }
            this.dialog = {
                header: null,
                text: null,
                html: null,
                confirmLabel: null,
                kind: null,
                onConfirm: null,
                onCancel: null
            }
        },
        showDialogHandler (msg, onConfirm, onCancel) {
            if (typeof (msg) === 'string') {
                this.dialog.content = msg
            } else {
                // msg is an object, let's break it apart
                this.dialog.header = msg.header
                this.dialog.text = msg.text
                this.dialog.html = msg.html
                this.dialog.confirmLabel = msg.confirmLabel
                this.dialog.kind = msg.kind
                this.dialog.disablePrimary = msg.disablePrimary
            }
            this.dialog.onConfirm = onConfirm
            this.dialog.onCancel = onCancel
        }
    },
    mounted () {
        dialog.bind(this.$refs.dialog, this.showDialogHandler)
    }
}
