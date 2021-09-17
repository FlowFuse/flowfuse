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
const migrations = require("./migrations")

const fp = require("fastify-plugin");

module.exports = fp(async function(app, _opts, next) {

    const dbOptions = {
        dialect: process.env.DB_TYPE || 'sqlite',
    }
    if (dbOptions.dialect === 'sqlite') {
        if (process.env.DB_SQLITE_STORAGE) {
            dbOptions.storage =  process.env.DB_SQLITE_STORAGE
        }
    }

    if (process.env.DB_LOGGING !== 'true') {
        dbOptions.logging = false;
    }
    const sequelize = new Sequelize(dbOptions)
    await sequelize.authenticate();

    // const R = async function(f) { console.log(JSON.stringify(await f," ",4)); }

    const db = {
        init: async function(skipMigrationCheck) {
            await migrations.init(db);
            const currentVersion = await migrations.getCurrentVersion();
            if (currentVersion) {
                if (!skipMigrationCheck) {
                    const hasPendingMigrations = migrations.hasPendingMigrations();
                    if (hasPendingMigrations) {
                        throw new Error("Database has pending migrations")
                    }
                }
            } else {
                // Empty database - initialise by applying all migrations
                await migrations.applyPendingMigrations();
            }
            await models.init(db)
            await views.init(db);
            await controllers.init(db);

            await require("./test-data").inject(app);
        },
        sequelize,
        models,
        views,
        controllers,
        migrations
    }
    // const initMigration = require("./migrations/000000-initial.js");
    // await initMigration.up(sequelize.getQueryInterface())

    app.decorate('db', db)

    next();
});
