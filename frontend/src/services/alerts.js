const subscriptions = []

export default {
    subscribe: function (fcn) {
        subscriptions.push(fcn)
    },
    /**
     * Show a toast notification
     * @param {string} msg The message to show
     * @param {'info'|'confirmation'|'warning'} [type] Toast style
     * @param {number} [countdown] How long to show (defaults to 3s)
     */
    emit: function (msg, type, countdown) {
        // type: 'info' | 'confirmation' | 'warning'
        // countdown: defaults to 3000 if not provided
        for (let fcn = 0; fcn < subscriptions.length; fcn++) {
            subscriptions[fcn](msg, type, countdown)
        }
    }
}
