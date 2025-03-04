import { markRaw } from 'vue'

import dialog from '../services/dialog.js'

export default {
    data () {
        return {
            dialog: {
                header: null,
                text: null,
                textLines: null,
                html: null,
                is: null,
                confirmLabel: null,
                kind: null,
                canBeCanceled: true,
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
                textLines: null,
                html: null,
                is: null,
                confirmLabel: null,
                kind: null,
                canBeCanceled: true,
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
                this.dialog.textLines = msg.text?.split('\n')
                this.dialog.html = msg.html
                this.dialog.is = markRaw(msg.is)
                this.dialog.confirmLabel = msg.confirmLabel
                this.dialog.kind = msg.kind
                this.dialog.disablePrimary = msg.disablePrimary
                if (Object.prototype.hasOwnProperty.call(msg, 'canBeCanceled')) {
                    this.dialog.canBeCanceled = msg.canBeCanceled
                }
            }
            this.dialog.onConfirm = onConfirm
            this.dialog.onCancel = onCancel
        }
    },
    mounted () {
        dialog.bind(this.$refs.dialog, this.showDialogHandler)
    }
}
