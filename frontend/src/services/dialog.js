let dialog
const subscriptions = []

export default {
    // bind this service to a ff-dialog element
    bind: function (el, fcn) {
        console.log(el)
        dialog = el
        subscriptions.push(fcn)
    },
    show: async function (msg) {
        for (let fcn = 0; fcn < subscriptions.length; fcn++) {
            subscriptions[fcn](msg)
        }
        dialog.show()
    }
}
