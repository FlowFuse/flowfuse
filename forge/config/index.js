/**
 * Handle loading runtime configuration.
 *
 * Load from $FLOWFORGE_HOME/etc/flowforge.yml
 *
 * If $FLOWFORGE_HOME is not defined
 *  - if $NODE_ENV=development
 *      - set $FLOWFORGE_HOME to the root of the repository
 *  - else if `/opt/flowforge` exists - use that
 *  - else use $CWD
 *
 *
 * @namespace config
 * @memberof forge
 **/

const fs = require('fs')
const path = require('path')

const fp = require('fastify-plugin')
const YAML = require('yaml')

const rateLimits = require('../routes/rateLimits.js')

const features = require('./features')

// const FastifySecrets = require('fastify-secrets-env')

let config = {}

module.exports = {
    init: (opts) => {
        if (opts.config) {
            // A custom config has been passed in. This means we're running
            // programmatically rather than manually. At this stage, that
            // means its our test framework.
            process.env.NODE_ENV = 'development'
            process.env.FLOWFORGE_HOME = process.cwd()
        } else if (!process.env.FLOWFORGE_HOME) {
            if (process.env.NODE_ENV === 'development') {
                process.env.FLOWFORGE_HOME = path.resolve(__dirname, '../..')
            } else {
                if (fs.existsSync('/opt/flowforge')) {
                    process.env.FLOWFORGE_HOME = '/opt/flowforge'
                } else {
                    process.env.FLOWFORGE_HOME = process.cwd()
                }
            }
        }

        let ffVersion
        if (process.env.npm_package_version) {
            ffVersion = process.env.npm_package_version
            // npm start
        } else {
            // everything else
            const { version } = require(path.join(module.parent.path, '..', 'package.json'))
            ffVersion = version
        }
        try {
            fs.statSync(path.join(__dirname, '..', '..', '.git'))
            ffVersion += '-git'
        } catch (err) {
            // No git directory
        }

        if (opts.config !== undefined) {
            // Programmatically provided config - eg tests
            config = { ...opts.config }
        } else {
            // Load from file
            let configFile = path.join(process.env.FLOWFORGE_HOME, '/etc/flowforge.yml')
            if (fs.existsSync(path.join(process.env.FLOWFORGE_HOME, '/etc/flowforge.local.yml'))) {
                configFile = path.join(process.env.FLOWFORGE_HOME, '/etc/flowforge.local.yml')
            }
            try {
                const configFileContent = fs.readFileSync(configFile, 'utf-8')
                config = YAML.parse(configFileContent)
                config.configFile = configFile
            } catch (err) {
                throw new Error(`Failed to read config file ${configFile}: ${err}`)
            }
        }
        // Ensure sensible defaults

        config.version = ffVersion
        config.home = process.env.FLOWFORGE_HOME
        config.port = process.env.PORT || config.port || 3000
        config.host = config.host || 'localhost'
        config.base_url = config.base_url || `http://${config.host}:${config.port}`
        config.api_url = config.api_url || config.base_url

        process.env.FLOWFORGE_BASE_URL = config.base_url
        process.env.FLOWFORGE_API_URL = config.api_url

        if (!config.email) {
            config.email = { enabled: false }
        }

        if (!config.driver) {
            config.driver = { type: 'localfs' }
        }

        if (!config.telemetry) {
            config.telemetry = {
                enabled: true,
                plausible: {
                    domain: null
                }
            }
        }

        if (!config.device) {
            config.device = {
                cache_path: path.join(config.home, '/var/device/cache')
            }
        }

        // need to check that maxIdleDuration is less than maxDuration
        if (config.sessions) {
            if (config.sessions.maxIdleDuration && config.sessions.maxDuration) {
                if (config.sessions.maxIdleDuration > config.sessions.maxDuration) {
                    throw new Error('Session maxIdleDuration longer than maxDuration')
                    // config.sessions.maxIdleDuration = config.sessions.maxDuration
                }
            } else if (config.sessions.maxIdleDuration) {
                if (config.sessions.maxIdleDuration > (60 * 60 * 24 * 7)) {
                    throw new Error('Session maxIdleDuration longer than maxDuration')
                }
            }
        }

        const defaultLogging = {
            level: 'info',
            http: 'warn',
            pretty: process.env.NODE_ENV === 'development'
        }
        config.logging = { ...defaultLogging, ...config.logging }

        return config
    },

    attach: fp(async function (app, opts) {
        config.features = features(app, config)
        config.rate_limits = rateLimits.getLimits(app, config.rate_limits)
        Object.freeze(config)
        app.decorate('config', config)

        if (process.env.NODE_ENV === 'development') {
            app.log.info('Development mode')
        }
        app.log.info(`FlowFuse v${config.version}`)
        app.log.info(`FlowFuse running with NodeJS ${process.version}`)
        app.log.info(`FlowFuse Data Directory: ${process.env.FLOWFORGE_HOME}`)
        if (config.configFile) {
            app.log.info(`Config File: ${config.configFile}`)
        }
    }, { name: 'app.config' })
}
