/**
 * Stub Container driver
 *
 * Handles the creation and delegation of containers to back Projects
 *
 * This Stub driver doesn't start any real containers, just keeps state in memory
 *
 * @module stub
 * @memberof forge.containers.drivers
 *
 */
const { normalize } = require('path')

const nrUtil = require('@node-red/util') // eslint-disable-line

const forgeUtils = require('../../db/utils')

const list = {}
const files = {}

module.exports = {
    START_DELAY: 500,
    STOP_DELAY: 250,
    /**
     * Initialises this driver
     *
     * Use app.db.models.Project.findAll() to get a list of all projects
     * and do the work to synchronise the internal state with that list
     *
     * @param {string} app - the forge application
     * @param {object} options - A set of configuration options for the driver
     * @return {forge.containers.ProjectArguments}
     */
    init: async (app, options) => {
        this._options = options
        this._app = app

        const projects = await this._app.db.models.Project.findAll()
        projects.forEach(project => {
            if (project.state !== 'suspended') {
                const p = {
                    id: project.id,
                    state: 'running',
                    url: project.url,
                    options: {},
                    meta: { foo: 'bar' }
                }
                list[project.id] = p
            }
        })

        return {
            stack: {
                properties: {
                    nodered: {
                        label: 'Node-RED Version',
                        validate: '^(0|[1-9]\\d*)(\\.(0|[1-9]\\d*|x|\\*)(\\.(0|[1-9]\\d*|x|\\*))?)?$',
                        invalidMessage: 'Invalid version number - expected x.y.z'
                    }
                }
            }
        }
    },

    /**
     * Start a new Project
     *
     * If the driver has any driver-specific settings for the project, then
     * it can use the following to store them in the app database:
     *
     * Single property
     *   await project.updateSetting("pid",123)
     *
     * Bulk update
     *   await project.updateSettings({
     *     pid: pid,
     *     path: directory,
     *     port: port,
     *   })
     *
     * This *must* generate a clean set of auth tokens to pass to the launcher.
     * Calling this function will replace any existing tokens with a new set -
     * there can only be one active launcher per project.
     *
     *   const authTokens = await project.refreshAuthTokens();
     *
     * Once created, this *must* set the `url` property of the project:
     *
     *   project.url = "http://localhost:" + port;
     *   await project.save()
     *
     *
     * @param {Project} project - the project model instance
     * @return {forge.containers.Project}
     */
    start: async (project) => {
        this._app.log.info(`[stub driver] Starting ${project.id}`)
        if (!list[project.id] || list[project.id].state === 'suspended') {
            list[project.id] = {
                id: project.id,
                state: 'starting',
                url: `http://${project.name}.${this._options.domain}`,
                meta: { foo: 'bar' },
                stack: project.ProjectStack.hashid
            }
            project.url = list[project.id].url
            await project.save()
            if (await project.getSetting('stubProjectToken') === undefined) {
                const stubProjectToken = forgeUtils.generateToken(8)
                await project.updateSetting('stubProjectToken', stubProjectToken)
            }
            if (project.name === 'stub-fail-start') {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        delete list[project.id]
                        reject(new Error('failing to start project'))
                    }, 500)
                })
            } else {
                const startTime = project.name === 'stub-slow-start' ? 6000 : module.exports.START_DELAY
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        list[project.id].state = 'running'
                        resolve()
                    }, startTime)
                })
            }
        } else {
            throw new Error('Name already exists')
        }
    },
    /**
     * Stop a project
     * @param {Project} project - the project model instance
     * @return {Object}
     */
    stop: async (project) => {
        this._app.log.info(`[stub driver] Stopping ${project.id}`)
        if (list[project.id]) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    list[project.id].state = 'suspended'
                    resolve()
                }, module.exports.STOP_DELAY)
            })
        } else {
            throw new Error(`${project.id} not found`)
        }
    },
    /**
     * Removes a Project
     * @param {Project} project - the project model instance
     * @return {Object}
     */
    remove: async (project) => {
        this._app.log.info(`[stub driver] Removing ${project.id}`)
        if (list[project.id]) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    delete list[project.id]
                    resolve()
                }, 250)
            })
        }
    },
    /**
     * Retrieves details of a project's container
     * @param {Project} project - the project model instance
     * @return {Object}
     */
    details: async (project) => {
        return list[project.id]
    },
    /**
     * Returns an object holding the values to plug into a Projects `settings.js`
     * file by the nr-launcher
     *
     * @param {Project} project - the project model instance
     * @return {Object}
     */
    settings: async (project) => {
        const settings = {
            stubProjectToken: await project.getSetting('stubProjectToken'),
            isStubDriver: true
        }
        return settings
    },

    /**
     * Starts a Project's flows
     * @param {Project} project - the project model instance
     * @param {} options
     * @return {forge.Status}
     */
    startFlows: async (project, options) => {
        if (list[project.id]) {
            this._app.log.info(`[stub driver] Start flows ${project.id}`)
            list[project.id].state = 'running'
        }
    },
    /**
     * Stops a Project's flows
     * @param {Project} project - the project model instance
     * @param {} options
     * @return {forge.Status}
     */
    stopFlows: async (project, options) => {
        if (list[project.id]) {
            this._app.log.info(`[stub driver] Stop flows ${project.id}`)
            list[project.id].state = 'stopped'
        }
    },
    /**
     * Restarts a Project's flows
     * @param {Project} project - the project model instance
     * @param {} options
     * @return {forge.Status}
     */
    restartFlows: async (project, options) => {
        this._app.log.info(`[stub driver] Restarting flows ${project.id}`)
    },

    /**
     * Get a Project's logs
     * @param {Project} project - the project model instance
     * @return {array} logs
     */
    logs: async (project) => {
        const oneHour = 360000

        return [
            {
                level: 'system',
                msg: 'Fake Log Entry',
                ts: `${Date.now() - oneHour}`,
                src: 'one'
            },
            {
                level: 'system',
                msg: 'Starting Node-RED',
                ts: `${Date.now() - oneHour / 2}`,
                src: 'one'
            },
            {
                level: 'info',
                msg: '\n\nMulti Line Message\n===================\n',
                ts: `${Date.now() - oneHour / 4}`,
                src: 'one'
            },
            {
                level: 'warn',
                msg: 'This is the voice of the Mysterons. We know that you can hear us Earthmen.',
                ts: `${Date.now() - oneHour / 5}`,
                src: 'one'
            },
            {
                level: 'error',
                msg: 'Captain Scarlet is indestructible',
                ts: `${Date.now()}`,
                src: 'two'
            }
        ]
    },
    /**
     * Shutdown Driver
     */
    shutdown: async () => {

    },
    getDefaultStackProperties: () => {
        return {
            nodered: '3.0.2',
            ...this._app.config.driver.options?.default_stack
        }
    },
    revokeUserToken: async (project, token) => { },

    // File API
    // Static Assets API
    listFiles: async (instance, filePath) => {
        if (!list[instance.id] || list[instance.id].state === 'suspended') {
            throw new Error('Cannot access instance files')
        }
        if (!files[instance.id]) {
            files[instance.id] = {}
        }
        const pathDots = filePath.replace('/', '.')
        const response = {
            meta: {},
            files: [],
            count: 0
        }
        try {
            const dir = pathDots ? nrUtil.util.getObjectProperty(files[instance.id], pathDots) : files[instance.id]
            Object.keys(dir).forEach(entry => {
                if (typeof dir[entry] === 'object') {
                    response.files.push({
                        name: entry,
                        type: 'directory',
                        lastModified: new Date().toISOString()
                    })
                } else {
                    response.files.push({
                        name: entry,
                        type: 'file',
                        size: dir[entry].length,
                        lastModified: new Date().toISOString()
                    })
                }
                response.count++
            })
            return response
        } catch (err) {
            if (err.message === 'Cannot convert undefined or null to object' || err.message.startsWith('Cannot read properties of undefined')) {
                const newErr = new Error('not found')
                newErr.statusCode = 404
                throw newErr
            } else {
                throw err
            }
        }
    },

    updateFile: async (instance, filePath, update) => {
        if (!list[instance.id] || list[instance.id].state === 'suspended') {
            throw new Error('Cannot access instance files')
        }
        if (!files[instance.id]) {
            files[instance.id] = {}
        }
        // const pathDots = filePath.replace('/','.')
        // const dir = pathDots ? nrUtil.util.getObjectProperty(files[instance.id], pathDots) : files[instance.id]
    },

    deleteFile: async (instance, filePath) => {
        if (!list[instance.id] || list[instance.id].state === 'suspended') {
            throw new Error('Cannot access instance files')
        }
        if (!files[instance.id]) {
            files[instance.id] = {}
        }
        const parts = normalize(filePath).split('/')
        const filename = parts.pop()
        if (parts.indexOf('..') !== -1) {
            if (parts.indexOf('..') === 0) {
                const newErr = new Error('not found')
                newErr.statusCode = 404
                throw newErr
            } else {
                while (parts.indexOf('..') !== -1) {
                    parts.splice(parts.indexOf('..') - 1, 2)
                }
            }
        }
        const pathDots = parts.join('.')
        try {
            const dir = pathDots ? nrUtil.util.getObjectProperty(files[instance.id], pathDots) : files[instance.id]
            delete dir[filename]
        } catch (err) {
            if (err.message === 'Cannot convert undefined or null to object' || err.message.startsWith('Cannot read properties of undefined')) {
                const newErr = new Error('not found')
                newErr.statusCode = 404
                throw newErr
            } else {
                throw err
            }
        }
    },
    createDirectory: async (instance, filePath, directoryName) => {
        if (!list[instance.id] || list[instance.id].state === 'suspended') {
            throw new Error('Cannot access instance files')
        }
        if (!files[instance.id]) {
            files[instance.id] = {}
        }
        const pathDots = filePath.replace('/', '.')
        const nameDots = directoryName.replace('/', '.')
        try {
            const dir = pathDots ? nrUtil.util.getObjectProperty(files[instance.id], pathDots) : files[instance.id]
            nrUtil.util.setObjectProperty(dir, nameDots, {}, true)
        } catch (err) {
            if (err.message === 'Cannot convert undefined or null to object' || err.message.startsWith('Cannot read properties of undefined')) {
                const newErr = new Error('not found')
                newErr.statusCode = 404
                throw newErr
            } else {
                throw err
            }
        }
    },
    uploadFile: async (instance, filePath, readableStream) => {
        if (!list[instance.id] || list[instance.id].state === 'suspended') {
            throw new Error('Cannot access instance files')
        }
        if (!files[instance.id]) {
            files[instance.id] = {}
        }
        const parts = normalize(filePath).split('/')
        const filename = parts.pop()
        if (parts.indexOf('..') !== -1) {
            if (parts.indexOf('..') === 0) {
                const newErr = new Error('not found')
                newErr.statusCode = 404
                throw newErr
            } else {
                while (parts.indexOf('..') !== -1) {
                    parts.splice(parts.indexOf('..') - 1, 2)
                }
            }
        }
        const pathDots = parts.join('.')
        try {
            const dir = pathDots ? nrUtil.util.getObjectProperty(files[instance.id], pathDots) : files[instance.id]
            dir[filename] = readableStream.toString('utf-8')
        } catch (err) {
            if (err.message === 'Cannot convert undefined or null to object' || err.message.startsWith('Cannot read properties of undefined')) {
                const newErr = new Error('not found')
                newErr.statusCode = 404
                throw newErr
            } else {
                throw err
            }
        }
    },

    // 3rd party broker
    startBrokerAgent: async (broker) => {},
    stopBrokerAgent: async (broker) => {},
    getBrokerAgentState: async (broker) => {}
}
