const { CronosExpression } = require('cronosjs')

const { randomInt } = require('../../../../housekeeper/utils')
const { syncBridge } = require('../emxq-bridge/setup.js')
const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms))

module.exports = ({ schedule, startDelay, maxResponseTime, maxSuccessiveFailureCount } = {}) => {
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

    // Check everything is in order and throw if not
    if (!Number.isFinite(startDelay) || startDelay < 0) {
        throw new RangeError(`startDelay must be a non-negative number of ms, got ${startDelay}`)
    }
    if (!Number.isFinite(maxResponseTime) || maxResponseTime < 0) {
        throw new RangeError(`maxResponseTime must be a non-negative number of ms, got ${maxResponseTime}`)
    }
    if (!Number.isFinite(maxSuccessiveFailureCount) || maxSuccessiveFailureCount < 0) {
        throw new RangeError(`maxSuccessiveFailureCount must be a non-negative number, got ${maxSuccessiveFailureCount}`)
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
                if (err && result.errorCount > 0 && result.errorCount % maxSuccessiveFailureCount === 0) {
                    app.log.error(`Expert Agent bridge heartbeat failed ${result.errorCount} times in a row, re-synchronizing the bridge`)
                    try {
                        await syncBridge(app, { force: true }) // force tears down and re-creates the bridge.
                    } catch (syncErr) {
                        app.log.error(`Error synchronizing bridge after heartbeat failure: ${syncErr.message}`)
                    }
                }
            })
        }
    }
}
