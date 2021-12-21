/**
 * The database connection.
 *
 * This handles the connection to the database and the data models, views and
 * controllers.
 *
 *  - {@link forge.db.models models} - The underlying data models
 *  - {@link forge.db.views views} - Utilities for generating presentable views of models
 *  - {@link forge.db.controllers controllers} - Utilities for operating on the models
 *
 * @namespace db
 * @memberof forge
 */

const { Sequelize } = require('sequelize');
const models = require("./models")
const views = require("./views")
const controllers = require("./controllers")
const utils = require("./utils");

const fp = require("fastify-plugin");

module.exports = fp(async function(app, _opts, next) {

    const dbOptions = {
        dialect: process.env.DB_TYPE || 'sqlite',
    }
    if (dbOptions.dialect === 'sqlite') {
        if (process.env.DB_SQLITE_STORAGE) {
            dbOptions.storage =  process.env.DB_SQLITE_STORAGE
        }
    } else if (dbOptions.dialect === 'mariadb') {
        if (process.env.DB_MARIADB_HOST) {
            dbOptions.host = process.env.DB_MARIADB_HOST || "mariadb"
        }
         if (process.env.DB_MARIADB_PORT) {
            dbOptions.host = process.env.DB_MARIADB_PORT || 3306
        }
        if (process.env.DB_MARIADB_USER) {
            dbOptions.username = process.env.DB_MARIADB_USER
        }
        if (process.env.DB_MARIADB_PASSWORD) {
            dbOptions.password = process.env.DB_MARIADB_PASSWORD
        }
        dbOptions.database = "flowforge"
    } else if (dbOptions.dialect === 'postgres') {
        if (process.env.DB_POSTGRES_HOST) {
            dbOptions.host = process.env.DB_POSTGRES_HOST || "postgres"
        }
         if (process.env.DB_POSTGRES_PORT) {
            dbOptions.host = process.env.DB_POSTGRES_PORT || 5432
        }
        if (process.env.DB_POSTGRES_USER) {
            dbOptions.username = process.env.DB_POSTGRES_USER
        }
        if (process.env.DB_POSTGRES_PASSWORD) {
            dbOptions.password = process.env.DB_POSTGRES_PASSWORD
        }
        dbOptions.database = "flowforge"
    }

    if (process.env.DB_LOGGING !== 'true') {
        dbOptions.logging = false;
    }

    const sequelize = new Sequelize(dbOptions)

    // const R = async function(f) { console.log(JSON.stringify(await f," ",4)); }

    const db = {
        sequelize,
        models,
        views,
        controllers,
        utils
    }

    await sequelize.authenticate();
    await models.init(db)
    await views.init(db);
    await controllers.init(app);

    app.decorate('db', db)

    await require("./test-data").inject(app);

    next();
});
