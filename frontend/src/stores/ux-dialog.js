import { defineStore } from 'pinia'

export const useUxDialogStore = defineStore('ux-dialog', {
    state: () => ({
        dialog: {
            boxClass: null,
            cancelLabel: null,
            canBeCanceled: true,
            closeOnConfirm: true,
            confirmLabel: null,
            contentClass: '',
            disablePrimary: false,
            header: null,
            html: null,
            is: null,
            kind: null,
            onCancel: null,
            onConfirm: null,
            subHeader: null,
            text: null,
            textLines: null,
            notices: []
        }
    }),
    actions: {
        clearDialog (cancelled = false) {
            if (cancelled) {
                this.dialog.onCancel?.()
            }
            this.$reset()
        },
        showDialogHandlers ({ payload, onConfirm, onCancel }) {
            this.clearDialog(false)

            if (typeof payload === 'string') {
                this.dialog.content = payload
            } else {
                this.dialog.header = payload.header
                this.dialog.text = payload.text
                this.dialog.textLines = payload.text?.split('\n')
                this.dialog.html = payload.html
                this.dialog.is = payload.is ?? undefined
                this.dialog.confirmLabel = payload.confirmLabel
                this.dialog.cancelLabel = payload.cancelLabel
                this.dialog.kind = payload.kind
                this.dialog.disablePrimary = payload.disablePrimary
                this.dialog.notices = payload.notices
                if (Object.prototype.hasOwnProperty.call(payload, 'canBeCanceled')) {
                    this.dialog.canBeCanceled = payload.canBeCanceled
                }
                if (Object.prototype.hasOwnProperty.call(payload, 'closeOnConfirm')) {
                    this.dialog.closeOnConfirm = payload.closeOnConfirm
                }
                this.dialog.boxClass = payload.boxClass
            }
            this.dialog.onConfirm = onConfirm
            this.dialog.onCancel = onCancel
        },
        setDisablePrimary (value) {
            this.dialog.disablePrimary = value
        },
        // changes the props of the component the dialog is showing, e.g. to hand it an error from the server
        updateDialogPayload (payload) {
            if (this.dialog.is) {
                Object.assign(this.dialog.is.payload, payload)
            }
        },
        setDialogDevices (devices) {
            this.dialog.is.payload.devices = devices
        }
    }
})
