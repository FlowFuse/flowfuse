const fp = require('fastify-plugin')
const { scheduleTask } = require('cronosjs')

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
module.exports = fp(async function (app, _opts, next) {
    const tasks = {}

    // Ensure we stop any scheduled tasks when the app is shutting down
    app.addHook('onClose', async (_) => {
        Object.values(tasks).forEach(task => {
            if (task.job) {
                task.job.stop()
                delete task.job
            }
        })
    })

    // Register a task to be run on a particular schedule
    async function registerTask (task) {
        tasks[task.name] = task

        // Startup tasks are run instantly
        if (task.startup) {
            await task.run(app).catch(err => {
                app.log.error(`Error running task '${task.name}: ${err.toString()}`)
            })
        }

        // If the task has a schedule (cron-string), setup the job
        if (task.schedule) {
            task.job = scheduleTask(task.schedule, (timestamp) => {
                app.log.trace(`Running task '${task.name}'`)
                task.run(app).catch(err => {
                    app.log.error(`Error running task '${task.name}: ${err.toString()}`)
                })
            })
        }
    }

    await registerTask(require('./tasks/expireTokens'))

    next()
})
