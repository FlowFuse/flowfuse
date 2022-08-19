let dialog
const subscriptions = []

export default {
    // bind this service to a ff-dialog element
    // this is used in Platform.vue in order to control the showing/hiding
    // of the app's main dialog
    bind: function (el, fcn) {
        dialog = el
        subscriptions.push(fcn)
    },
    // .show() function is used across the app in order to
    // show and act upon confirmation (via onConfirm) of any dialogs.

    // Dialog.show({
    //     header: '<header title>',
    //     kind: (optional) 'danger',
    //     text: 'show this message in the dialog',
    //     html: 'instead of "text", you can provide html for more custom appearance and content',
    //     confirmLabel: '<confirm-label>'
    // }, async () => {
    //     // callback goes here
    // })
    show: async function (msg, onConfirm) {
        for (let fcn = 0; fcn < subscriptions.length; fcn++) {
            subscriptions[fcn](msg, onConfirm)
        }
        dialog.show()
    }
}
