/**
 * @typedef {Object} PollTimer
 * @property {Function} start - Starts the timer
 * @property {Function} stop - Stops the timer
 * @property {Function} pause - Pauses the timer
 * @property {Function} resume - Resumes the timer
 * @property {Function} callback - The callback function to be called on each interval
 * @property {Boolean} paused - Whether the timer is currently paused
 * @property {Number} interval - The poll interval in milliseconds
 * @property {Boolean} running - Whether the timer is currently running
 */

/**
 * A utility function for generating simple stop/start timers in Vue components
 * @param {Function} callback - The callback function to be called on each interval
 * @param {Number} [interval] - The poll interval in milliseconds (Optional, defaults to 5000)
 * @param {Boolean} [autoStart] - Whether to start the timer immediately (Optional, defaults to `true`)
 * @example
 * // In a Vue component
 * import { createPollTimer } from 'vue-timers'
 *
 * this.pollTimer = createPollTimer(this.pollTimerHandler, 5000)
 * this.pollTimer.start()
 *
 * this.pollTimer.stop()
 * @returns {PollTimer} An `PollTimer` object with `start` and `stop` methods
 */
function createPollTimer (callback, interval = 5000, autoStart = true) {
    let _timer = null
    let _paused = false
    let _callback = callback
    /** @type {PollTimer} */
    const pollTimer = {
        start,
        stop,
        pause,
        resume,
        get callback () { return _callback },
        set callback (value) { _callback = value },
        get paused () { return !!_timer && _paused },
        get interval () { return interval },
        set interval (value) {
            interval = value
            if (_timer) {
                stop()
                start()
            }
        },
        get running () { return !!_timer }
    }

    function start () {
        // console.log('PollTimer: start')
        if (pollTimer.running) {
            // console.log('PollTimer: already running')
            return
        }
        _timer = setInterval(() => {
            if (!_paused) {
                if (typeof _callback === 'function' && _timer) {
                    // console.log('PollTimer: callback')
                    _callback()
                }
            }
        }, interval)
    }

    function stop () {
        // console.log('PollTimer: stop')
        clearInterval(_timer)
        _timer = null
    }

    function pause () {
        // console.log('PollTimer: pause')
        _paused = true
    }

    function resume () {
        // console.log('PollTimer: resume')
        _paused = false
    }

    if (autoStart) {
        start()
    }

    return pollTimer
}

export {
    createPollTimer
}
