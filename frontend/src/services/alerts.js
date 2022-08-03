const subscriptions = []

export default {
    subscribe: function (fcn) {
        subscriptions.push(fcn)
    },
    emit: function (msg, type, countdown) {
        // type: 'info' | 'confirmation' | 'warning'
        // countdown: defaults to 3000 if not provided
        for (let fcn = 0; fcn < subscriptions.length; fcn++) {
            subscriptions[fcn](msg, type, countdown)
        }
    }
}
