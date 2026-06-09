type PollCallback = () => void

interface PollTimer {
    start: () => void
    stop: () => void
    pause: () => void
    resume: () => void
    callback: PollCallback
    readonly paused: boolean
    interval: number
    readonly running: boolean
}

// Simple stop/start poll timer for use in Vue components
function createPollTimer (callback: PollCallback, interval = 5000, autoStart = true): PollTimer {
    let _timer: ReturnType<typeof setInterval> | null = null
    let _paused = false
    let _callback = callback
    const pollTimer: PollTimer = {
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
        if (pollTimer.running) {
            return
        }
        _timer = setInterval(() => {
            if (!_paused) {
                if (typeof _callback === 'function' && _timer) {
                    _callback()
                }
            }
        }, interval)
    }

    function stop () {
        clearInterval(_timer)
        _timer = null
    }

    function pause () {
        _paused = true
    }

    function resume () {
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
