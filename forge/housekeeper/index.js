const { captureCheckIn, captureException } = require('@sentry/node')
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
    })

    function reportTask (name, schedule) {
        try {
            return captureCheckIn({
                monitorSlug: name,
                status: 'in_progress'
            },
            {
                schedule: {
                    type: 'crontab',
                    value: schedule
                },
                checkinMargin: 5,
                maxRuntime: 5,
                timezone: 'Etc/UTC'
            })
        } catch (error) {
            app.log.warn('Failed to report to Sentry', error)
        }
    }

    function reportTaskComplete (checkInId, name) {
        if (!checkInId) {
            return
        }

        try {
            captureCheckIn({
                checkInId,
                monitorSlug: name,
                status: 'ok'
            })
        } catch (error) {
            app.log.warn('Failed to report task complete to Sentry', error)
        }
    }

    function reportTaskFailure (checkInId, name, errorMessage) {
        if (checkInId) {
            try {
                captureCheckIn({
                    checkInId,
                    monitorSlug: name,
                    status: 'error',
                    errorMessage
                })
            } catch (error) {
                app.log.warn('Failed to report task failure to Sentry', error)
            }
        }

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
        app.log.trace(`Running task '${task.name}'`)

        const checkInId = reportTask(task.name, task.schedule)

        return task
            .run(app)
            .then(reportTaskComplete.bind(this, checkInId, task.name))
            .catch(err => {
                const errorMessage = `Error running task '${task.name}: ${err.toString()}`

                app.log.error(errorMessage)
                reportTaskFailure(checkInId, task.name, errorMessage)
            }).then(() => {
                app.log.trace(`Completed task '${task.name}'`)
                return null
            })
    }

    await registerTask(require('./tasks/expireTokens'))
    await registerTask(require('./tasks/licenseCheck'))
    await registerTask(require('./tasks/licenseOverage'))
    await registerTask(require('./tasks/telemetryMetrics'))
    await registerTask(require('./tasks/expireInvites'))
    await registerTask(require('./tasks/inviteReminder'))
    await registerTask(require('./tasks/blueprintImport'))
    await registerTask(require('./tasks/deviceUnusedReminder'))

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

    app.decorate('housekeeper', {
        registerTask
    })
}, { name: 'app.housekeeper' })
