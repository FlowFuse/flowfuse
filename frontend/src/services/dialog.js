let dialog
const subscriptions = []

export default {
    // bind this service to a ff-dialog element
    bind: function (el, fcn) {
        dialog = el
        subscriptions.push(fcn)
    },
    show: async function (msg, onConfirm) {
        for (let fcn = 0; fcn < subscriptions.length; fcn++) {
            subscriptions[fcn](msg, onConfirm)
        }
        dialog.show()
    }
}
