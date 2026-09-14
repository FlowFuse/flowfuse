const { CronosExpression } = require('cronosjs')

const { randomInt } = require('../../../../housekeeper/utils')
const { syncBridge } = require('../emxq-bridge/setup.js')
const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Re-sync after `base` failures, then with an exponentially growing gap capped at
// `maxInterval`, so re-syncs back off instead of firing on a fixed cadence forever.
function shouldResync (errorCount, base, maxInterval) {
    let threshold = base
    let gap = base
    while (threshold <= errorCount) {
        if (threshold === errorCount) {
            return true
        }
        gap = Math.min(gap * 2, maxInterval)
        threshold += gap
    }
    return false
}

module.exports = ({ schedule, startDelay, maxResponseTime, maxSuccessiveFailureCount, maxResyncInterval } = {}) => {
    const now = Date.now()
    if (startDelay === undefined || startDelay === null) {
        startDelay = 2 * 60 * 1000 // default to 2 minutes if not provided (0 is a valid value, meaning no delay)
    }
    if (!maxResponseTime) {
        maxResponseTime = 10000 // default to 10 seconds if not provided
    }
    if (!schedule) {
        schedule = `${randomInt(0, 59)} */1 * * * *` // default to a random second of every minute if no schedule is provided
    }

    // Ensure positive integer values for startDelay and maxResponseTime
    startDelay = +startDelay
    maxResponseTime = +maxResponseTime
    maxSuccessiveFailureCount = +(maxSuccessiveFailureCount ?? 3)
    maxResyncInterval = +(maxResyncInterval ?? 60)

    // Check everything is in order and throw if not
    if (!Number.isFinite(startDelay) || startDelay < 0) {
        throw new RangeError(`startDelay must be a non-negative number of ms, got ${startDelay}`)
    }
    if (!Number.isFinite(maxResponseTime) || maxResponseTime < 0) {
        throw new RangeError(`maxResponseTime must be a non-negative number of ms, got ${maxResponseTime}`)
    }
    if (!Number.isFinite(maxSuccessiveFailureCount) || maxSuccessiveFailureCount < 1) {
        throw new RangeError(`maxSuccessiveFailureCount must be a positive number, got ${maxSuccessiveFailureCount}`)
    }
    if (!Number.isFinite(maxResyncInterval) || maxResyncInterval < 1) {
        throw new RangeError(`maxResyncInterval must be a positive number, got ${maxResyncInterval}`)
    }

    // Validate schedule (basic/non-exhaustive):
    // * ensure the time between 2 runs is greater than the maxResponseTime (plus leeway)
    // * the cron is not a one-time cron (i.e. it should have more than 1 next run)
    const expr = CronosExpression.parse(schedule) // throws if invalid cron
    const sampleDates = expr.nextNDates(new Date(now + 6 * 30 * 24 * 60 * 60 * 1000), 10) // peek schedule dates ~6 month in the future
    if (sampleDates.length < 10) {
        throw new Error(`Invalid cron schedule: ${schedule} is not a recurring schedule`)
    }
    const intervals = sampleDates.filter((date, index) => index > 0).map((date, index) => date.getTime() - sampleDates[index].getTime())
    const intervalsSorted = intervals.sort((a, b) => a - b)
    const shortestInterval = intervalsSorted[0] // the shortest interval between runs
    const minimumTimeBetweenRuns = 2 * maxResponseTime // 2 times the maxResponseTime to allow for some leeway
    if (shortestInterval < minimumTimeBetweenRuns) {
        throw new Error(`Invalid cron schedule: ${schedule} is too frequent and may cause overlapping runs`)
    }

    const skipUntil = now + startDelay

    let hasConnected = false
    let loggedNeverConnected = false

    return {
        name: 'EmqxExpertBridgeHeartbeat',
        startup: false,
        schedule,
        run: async function (app) {
            /** @type {import('../../../../comms/expert.js').ExpertCommsHandler} */
            const expertCommsHandler = app.comms.expert

            if (Date.now() < skipUntil) {
                return // skip this run, as we are still in the startup delay period
            }

            // small random delay to further minimise contention on the bridge
            await sleep(randomInt(0, 999))

            // Request a heartbeat from the Expert Agent via the bridge
            expertCommsHandler.requestBridgeHeartbeat(maxResponseTime, async (err, result) => {
                if (!result) {
                    return
                }
                if (!err) {
                    hasConnected = true
                    return
                }
                if (result.errorCount <= 0) {
                    return
                }
                if (!hasConnected) {
                    // A bridge that has never connected has a config, token or network problem a
                    // rebuild cannot fix; leave it for EMQX to reconnect once the broker is reachable.
                    if (!loggedNeverConnected) {
                        app.log.warn('Expert Agent bridge has not completed a heartbeat yet; not re-synchronizing. Check the central broker is reachable and the token is valid - it will connect automatically once reachable.')
                        loggedNeverConnected = true
                    }
                    return
                }
                if (!shouldResync(result.errorCount, maxSuccessiveFailureCount, maxResyncInterval)) {
                    return
                }
                app.log.error(`Expert Agent bridge heartbeat failed ${result.errorCount} times in a row, re-synchronizing the bridge`)
                try {
                    await syncBridge(app, { force: true }) // force tears down and re-creates the bridge.
                } catch (syncErr) {
                    app.log.error(`Error synchronizing bridge after heartbeat failure: ${syncErr.message}`)
                }
            })
        }
    }
}
