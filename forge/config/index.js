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

const fs = require("fs");
const path = require("path");
const fp = require("fastify-plugin");
const YAML = require("yaml");
const FastifySecrets = require('fastify-secrets-env')

module.exports = fp(async function(app, _opts, next) {

    if (!process.env.FLOWFORGE_HOME) {
        if (process.env.NODE_ENV === "development") {
            app.log.info("Development mode")
            process.env.FLOWFORGE_HOME = path.resolve(__dirname, '../..')
        } else {
            if (fs.existsSync('/opt/flowforge')) {
                process.env.FLOWFORGE_HOME = '/opt/flowforge'
            } else {
                process.env.FLOWFORGE_HOME = process.cwd()
            }
        }
    }

    app.log.info(`FlowForge Data Directory: ${process.env.FLOWFORGE_HOME}`)

    const configFile = path.join(process.env.FLOWFORGE_HOME,'/etc/flowforge.yml')
    try {
        let configFileContent = fs.readFileSync(configFile,'utf-8');
        let config = YAML.parse(configFileContent);

        // Ensure sensible defaults

        config.home = process.env.FLOWFORGE_HOME;
        config.port = process.env.PORT || config.port || 3000;
        config.base_url = config.base_url || `http://localhost:${config.port}`;
        config.api_url = config.api_url || config.base_url;

        process.env.FLOWFORGE_BASE_URL = config.base_url;
        process.env.FLOWFORGE_API_URL = config.api_url;

        if (!config.email) {
            config.email = { enabled: false }
        }

        if (!config.driver) {
            config.driver = { type: 'localfs' }
        }

        Object.freeze(config);
        app.decorate("config",config);
    } catch(err) {
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
    next();
});
