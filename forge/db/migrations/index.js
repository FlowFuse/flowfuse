const fs = require('fs/promises')

const { DataTypes, Model } = require('sequelize')

const MIGRATIONS_DIR = __dirname

class MetaVersion extends Model {}

let pendingMigrations = []
let app

async function init (_app) {
    pendingMigrations = []
    app = _app
    // Ensure the metadata table exists
    // This is not kept with the other models as it needs to exist to bootstrap
    // the version checks

    MetaVersion.init({
        version: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        sequelize: app.db.sequelize,
        modelName: 'MetaVersion',
        timestamps: true,
        createdAt: false
    })
    await MetaVersion.sync()
}

async function getCurrentVersion (transaction) {
    return await MetaVersion.findOne({ order: [['id', 'DESC']], transaction })
}

async function checkPendingMigrations (transaction) {
    let migrationFiles = await fs.readdir(MIGRATIONS_DIR)
    migrationFiles = migrationFiles.filter(name => /^\d\d\d\d\d\d\d\d-\d\d-.*\.js$/.test(name))
    migrationFiles.sort()

    const tables = await app.db.sequelize.getQueryInterface().showAllTables()

    if (tables.length === 1) {
        // We only have the MetaVersion table. This means this is a brand-new
        // database that we need to initialise the structure of. This is
        // done by applying the migrations starting from the initialise-database-structure
        // migration
        let found = false
        pendingMigrations = []
        for (let i = 0; i < migrationFiles.length; i++) {
            if (migrationFiles[i] === '20240202-01-initialise-database-structure.js') {
                // This is the init migration. We want to run this one and any that
                // come after it.
                found = true
            }
            if (!found) {
                // This is an older migration we can skip running and just mark as done
                await MetaVersion.create({ version: migrationFiles[i] }, { transaction })
            } else {
                // This is migration we need to run
                pendingMigrations.push(migrationFiles[i])
            }
        }
    } else {
        // We have a populated database. Need to check if there are any migrations
        // to apply
        const currentVersion = await getCurrentVersion(transaction)

        // If currentVersion is null, then all migrations are needed
        let found = !currentVersion
        // Loop through the migrations from oldest to newest.
        // Filter out entries until we find the one matching the currentVersion.
        // From that point, return the remaining migrations
        pendingMigrations = migrationFiles.filter(name => {
            if (found) { return true }
            if (name === currentVersion.version) {
                found = true
            }
            return false
        })
    }
}

async function applyMigration (filename, transaction) {
    const queryInterface = app.db.sequelize.getQueryInterface()
    const migration = require('./' + filename)
    app.log.info(' - %s', filename)
    await migration.up(queryInterface)
    await MetaVersion.create({ version: filename }, { transaction })
}

async function applyPendingMigrations () {
    let pendingTransaction
    // For postgres, we want to hold a lock on the MetaVersions table so we can
    // be certain we're the only process applying the migrations.
    if (app.config.db.type === 'postgres') {
        pendingTransaction = await app.db.sequelize.transaction()
    }
    try {
        if (pendingTransaction) {
            // If another process holds the lock already, this will block until
            // the lock is released
            await app.db.sequelize.query('LOCK TABLE "MetaVersions" IN ACCESS EXCLUSIVE MODE', { transaction: pendingTransaction })
        }
        // Check to see what we need to apply
        await checkPendingMigrations(pendingTransaction)
        if (pendingMigrations.length > 0) {
            app.log.info('Database has pending migrations')
            if (!app.config.db.migrations || app.config.db.migrations.auto !== false) {
                app.log.info('Applying migrations:')
                for (let i = 0; i < pendingMigrations.length; i++) {
                    await applyMigration(pendingMigrations[i], pendingTransaction)
                }
                app.log.info('Finished applying migrations')
                // Update our view of what's pending
                await checkPendingMigrations(pendingTransaction)
            } else if (!app.config.db.migrations || !app.config.db.migrations.skipCheck) {
                throw new Error('Unapplied migrations')
            }
        }
        if (pendingTransaction) {
            await pendingTransaction.commit()
        }
    } catch (err) {
        if (pendingTransaction) {
            await pendingTransaction.rollback()
        }
        throw err
    }
}

module.exports = {
    init,
    applyPendingMigrations
}
