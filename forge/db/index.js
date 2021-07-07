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

    // const R = async function(f) { console.log(JSON.stringify(await f," ",4)); }

    const db = {
        sequelize,
        models,
        views,
        controllers
    }

    await sequelize.authenticate();
    await models.init(db)
    await views.init(db);
    await controllers.init(db);

    await require("./test-data").inject();

    app.decorate('db', db)

    next();
});
