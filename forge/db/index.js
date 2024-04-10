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

const path = require('path')

const fp = require('fastify-plugin')
const { Sequelize } = require('sequelize')

const controllers = require('./controllers')
const migrations = require('./migrations')
const models = require('./models')
const utils = require('./utils')
const views = require('./views')

module.exports = fp(async function (app, _opts) {
    utils.init(app)
    /** @type {import('sequelize').Options} */
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
        if (app.config.db.ssl) {
            dbOptions.dialectOptions = {
                ssl: true
            }
        }
    } else if (dbOptions.dialect === 'mssql') {
        dbOptions.host = app.config.db.host || 'mssql'
        dbOptions.port = +(app.config.db.port || 1433)
        dbOptions.username = app.config.db.user
        dbOptions.password = /* app.secrets.dbPassword || */ app.config.db.password
        dbOptions.database = app.config.db.database || 'flowforge'
        dbOptions.dialectOptions = {
            // Observe the need for nested `options` field for MSSQL
            options: {
                useUTC: true
            }
        }
        if (app.config.db.encrypt === true || app.config.db.encrypt === false) {
            dbOptions.dialectOptions.options.encrypt = app.config.db.encrypt // default is true in tds
        }
        if (app.config.db.trustServerCertificate === true || app.config.db.trustServerCertificate === false) {
            dbOptions.dialectOptions.options.trustServerCertificate = app.config.db.trustServerCertificate // default is true in tds
        }
        if (app.config.db.instanceName) {
            dbOptions.dialectOptions.options.instanceName = app.config.db.instanceName
        }
    }

    dbOptions.logging = !!app.config.db.logging

    const sequelize = new Sequelize(dbOptions)

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
    await migrations.applyPendingMigrations()

    await models.init(app)
    await views.init(app)
    await controllers.init(app)
}, { name: 'app.db' })
