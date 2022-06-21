const subscriptions = []

export default {
    subscribe: function (fcn) {
        subscriptions.push(fcn)
    },
    emit: function (msg, type) {
        for (let fcn = 0; fcn < subscriptions.length; fcn++) {
            subscriptions[fcn](msg, type)
        }
    }
}
