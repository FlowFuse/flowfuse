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

const features = require('./features')

// const FastifySecrets = require('fastify-secrets-env')

module.exports = fp(async function (app, opts, next) {
    if (opts.config) {
        // A custom config has been passed in. This means we're running
        // programmatically rather than manually. At this stage, that
        // means its our test framework.
        process.env.NODE_ENV = 'development'
        process.env.FLOWFORGE_HOME = process.cwd()
    } else if (!process.env.FLOWFORGE_HOME) {
        if (process.env.NODE_ENV === 'development') {
            app.log.info('Development mode')
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
    app.log.info(`FlowForge v${ffVersion}`)

    app.log.info(`FlowForge running with NodeJS ${process.version}`)

    app.log.info(`FlowForge Data Directory: ${process.env.FLOWFORGE_HOME}`)

    let configFile = path.join(process.env.FLOWFORGE_HOME, '/etc/flowforge.yml')
    if (fs.existsSync(path.join(process.env.FLOWFORGE_HOME, '/etc/flowforge.local.yml'))) {
        configFile = path.join(process.env.FLOWFORGE_HOME, '/etc/flowforge.local.yml')
    }
    if (!opts.config) {
        app.log.info(`Config File: ${configFile}`)
    }
    try {
        const configFileContent = fs.readFileSync(configFile, 'utf-8')
        const config = opts.config === undefined
            ? YAML.parse(configFileContent)
            : { ...opts.config }

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

        if (!config.logging) {
            config.logging = {
                level: 'info',
                http: 'warn'
            }
        } else {
            if (!config.logging.http) {
                config.logging.http = 'warn'
            }
        }

        config.features = features(app, config)

        Object.freeze(config)
        app.decorate('config', config)
    } catch (err) {
        app.log.error(`Failed to read config file ${configFile}: ${err}`)
    }

    // process.env.SESSION_SECRET =

    // TODO: use an env var to select other fastify-secrets-* plugins (AWS, GCP, ...)
    // app.register(FastifySecrets, {
    //   secrets: {
    //     sessionSecret: 'FLOWFORGE_SESSION_SECRET',
    //     dbPassword:'FLOWFORGE_DB_PASSWORD'
    //   }
    // })
    next()
})
