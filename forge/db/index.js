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

const { Sequelize } = require('sequelize')
const migrations = require('./migrations')
const models = require('./models')
const views = require('./views')
const controllers = require('./controllers')
const utils = require('./utils')
const path = require('path')
const fp = require('fastify-plugin')

module.exports = fp(async function (app, _opts, next) {
    utils.init(app)
    const dbOptions = {
        dialect: app.config.db.type || 'sqlite'
    }
    app.log.info(`Database driver: ${dbOptions.dialect}`)
    if (dbOptions.dialect === 'sqlite') {
        let filename = app.config.db.storage || 'forge.db'
        if (filename !== ':memory:') {
            if (!path.isAbsolute(filename)) {
                filename = path.join(app.config.home, 'var', filename)
            }
        }
        dbOptions.storage = filename
        app.log.info(`Database file: ${filename}`)
    } else if (dbOptions.dialect === 'mariadb') {
        dbOptions.host = app.config.db.host || 'mariadb'
        dbOptions.port = app.config.db.port || 3306
        dbOptions.username = app.config.db.user
        dbOptions.password = /* app.secrets.dbPassword || */ app.config.db.password
    } else if (dbOptions.dialect === 'postgres') {
        dbOptions.host = app.config.db.host || 'postgres'
        dbOptions.port = app.config.db.port || 5432
        dbOptions.username = app.config.db.user
        dbOptions.password = /* app.secrets.dbPassword || */ app.config.db.password
        dbOptions.database = app.config.db.database || 'flowforge'
    }

    dbOptions.logging = !!app.config.db.logging

    const sequelize = new Sequelize(dbOptions)

    // const R = async function(f) { console.log(JSON.stringify(await f," ",4)); }

    const db = {
        sequelize,
        models,
        views,
        controllers,
        utils
    }
    app.decorate('db', db)

    app.addHook('onClose', async (_) => {
        await sequelize.close()
    })

    await sequelize.authenticate()

    await migrations.init(app)

    if (migrations.hasPendingMigrations()) {
        app.log.info('Database has pending migrations')
        if (!app.config.db.migrations || app.config.db.migrations.auto !== false) {
            await migrations.applyPendingMigrations()
        } else if (!app.config.db.migrations || !app.config.db.migrations.skipCheck) {
            throw new Error('Unapplied migrations')
        }
    }
    await models.init(app)
    await views.init(app)
    await controllers.init(app)

    // Ensure default Team Types exist
    const TeamTypeMigrations = [
        './migrations/20220808-02-create-default-team-types'
    ]
    const queryInterface = sequelize.getQueryInterface()
    for (let i = 0; i < TeamTypeMigrations.length; i++) {
        const migration = require(TeamTypeMigrations[i])
        await migration.up(queryInterface)
    }

    const { inject } = require('./test-data')
    await inject(app)

    next()
})
