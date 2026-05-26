const { captureException } = require('@sentry/node')
const { scheduleTask } = require('cronosjs')
const fp = require('fastify-plugin')

/**
 * House-keeper component
 *
 * Runs regular maintenance tasks to keep things clean and tidy
 *
 * A task is defined as an object with the properties:
 * ```js
 * {
 *    name: 'name of the task',
 *    startup: true/false, // should the task be run whenever the platform starts
 *    schedule: '@daily', // cron string to define schedule. '@daily' means midnight
 *    run: async function(app) { } // the task itself
 * }
 * ```
 */
module.exports = fp(async function (app, _opts) {
    const tasks = {}
    const delayedStartupTasks = []
    const localLeaderVote = Math.round(Math.random() * 100000)
    const leaderVotes = {}
    // vote every 15 seconds
    const voteInterval = setInterval(() => {
        app.comms?.platform?.housekeeper?.vote(localLeaderVote)
    }, 15000)

    // Ensure we stop any scheduled tasks when the app is shutting down
    app.addHook('onClose', async () => {
        Object.values(tasks).forEach(task => {
            if (task.job) {
                task.job.stop()
                delete task.job
            }
        })
        delayedStartupTasks.forEach(startupTimeout => {
            clearTimeout(startupTimeout)
        })
        clearInterval(voteInterval)
    })

    function reportTaskFailure (errorMessage) {
        try {
            captureException(new Error(errorMessage))
        } catch (error) {
            app.log.warn('Failed to report task failure exception to Sentry', error)
        }
    }

    // Register a task to be run on a particular schedule
    async function registerTask (task) {
        // Allow the housekeeper to be disabled - this allows the tests
        // to run without fear the housekeeper may fire off a task at the same
        // time.
        if (app.config.housekeeper === false) {
            return
        }

        tasks[task.name] = task

        // If the task has a schedule (cron-string), setup the job
        if (task.schedule) {
            task.job = scheduleTask(task.schedule, (timestamp) => { runTask(task) })
        }
    }

    function runTask (task) {
        if (checkVote()) {
            app.log.trace(`Running task '${task.name}'`)

            return task
                .run(app)
                .catch(err => {
                    const errorMessage = `Error running task '${task.name}: ${err.toString()}`

                    app.log.error(errorMessage)
                    reportTaskFailure(errorMessage)
                }).then(() => {
                    app.log.trace(`Completed task '${task.name}'`)
                    return null
                })
        } else {
            app.log.trace(`Skipping task '${task.name}' not leader`)
            return null
        }
    }

    await registerTask(require('./tasks/expireTokens'))
    await registerTask(require('./tasks/licenseCheck'))
    await registerTask(require('./tasks/licenseOverage'))
    await registerTask(require('./tasks/telemetryMetrics'))
    await registerTask(require('./tasks/expireInvites'))
    await registerTask(require('./tasks/inviteReminder'))
    await registerTask(require('./tasks/blueprintImport'))
    await registerTask(require('./tasks/deviceUnusedReminder'))
    await registerTask(require('./tasks/certifiedNodes'))

    app.addHook('onReady', async () => {
        let promise = Promise.resolve()
        for (const task of Object.values(tasks)) {
            if (task.startup === true) {
                // Schedule startup run immediately (in queue with other tasks)
                promise = promise.then(() => runTask(task))
            } else if (typeof task.startup === 'number') {
                // Schedule startup run after the specified delay
                delayedStartupTasks.push(setTimeout(() => runTask(task), task.startup))
            }
        }
    })

    function updateLeader (vote) {
        if (vote.vote === -1) {
            delete leaderVotes[vote.id]
        } else {
            leaderVotes[vote.id] = vote.vote
        }
    }

    function checkVote () {
        const instances = Object.keys(leaderVotes)
        for (const i of instances) {
            if (leaderVotes[i] < localLeaderVote) {
                return false
            }
        }
        return true
    }

    app.decorate('housekeeper', {
        registerTask,
        updateLeader
    })
}, { name: 'app.housekeeper' })
