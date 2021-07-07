/**
 * Handle loading runtime configuration.
 *
 * This is designed to be pluggable in the future to allow loading of both
 * configuration and secrets from other sources - such as a credential vault.
 *
 * For now, it looks for a file called `.env.{NODE_ENV}` in the root of the repository.
 *
 * We provide `.env.development` as an example configuration. This set the following
 * defaults for the dev environment:
 *
 *  - Uses an sqlite database stored in `.forge.db`
 *  - Listens on port 3000
 *
 * @namespace config
 * @memberof forge
 **/

const fs = require("fs");
const path = require("path");
const fp = require("fastify-plugin");
const FastifySecrets = require('fastify-secrets-env')

module.exports = fp(async function(app, _opts, next) {

    const env = process.env.NODE_ENV || "development";

    let envFilePath = path.resolve(__dirname, `../../.env.${env}`)
    if (!fs.existsSync(envFilePath)) {
        console.warn("WARNING: env file ${envFilePath} not found. Falling back to .env.development")
        envFilePath = path.resolve(__dirname,`../../.env.development`);
    }
    require('dotenv').config({ path: envFilePath })

    // TODO: use an env var to select other fastify-secrets-* plugins (AWS, GCP, ...)
    app.register(FastifySecrets, {
      secrets: {
        sessionSecret: 'SESSION_SECRET'
      }
    })
    next();
});
