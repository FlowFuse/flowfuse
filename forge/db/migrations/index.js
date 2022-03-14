const { DataTypes, Model } = require('sequelize')

const fs = require('fs').promises

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
    await checkPendingMigrations()
}

async function getCurrentVersion () {
    return await MetaVersion.findOne({ order: [['id', 'DESC']] })
}

async function checkPendingMigrations () {
    let migrationFiles = await fs.readdir(MIGRATIONS_DIR)
    migrationFiles = migrationFiles.filter(name => /^\d\d\d\d\d\d\d\d-\d\d-.*\.js$/.test(name))
    migrationFiles.sort()

    const tables = await app.db.sequelize.getQueryInterface().showAllTables()

    if (tables.length === 1) {
        // We only have the MetaVersion table. This means this is a brand-new
        // database. We don't want to apply any migrations but we do want to
        // initialise the MetaVersion table to know they have been pre-applied
        for (let i = 0; i < migrationFiles.length; i++) {
            await MetaVersion.create({ version: migrationFiles[i] })
        }
    } else {
        // We have a populated database. Need to check if there are any migrations
        // to apply
        const currentVersion = await getCurrentVersion()

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

async function applyMigration (filename) {
    const queryInterface = app.db.sequelize.getQueryInterface()
    const migration = require('./' + filename)
    app.log.info(' - %s', filename)
    await migration.up(queryInterface)
    await MetaVersion.create({ version: filename })
}
async function applyPendingMigrations () {
    if (pendingMigrations.length > 0) {
        app.log.info('Applying migrations:')
        for (let i = 0; i < pendingMigrations.length; i++) {
            await applyMigration(pendingMigrations[i])
        }
        app.log.info('Finished applying migrations')
        await checkPendingMigrations()
    }
}

module.exports = {
    init,
    getCurrentVersion,
    hasPendingMigrations: _ => pendingMigrations.length > 0,
    applyPendingMigrations
}
