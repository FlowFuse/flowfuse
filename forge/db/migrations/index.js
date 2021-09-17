const { DataTypes, Model } = require('sequelize');

const fs = require("fs").promises;

const MIGRATIONS_DIR = __dirname;

class MetaVersion extends Model {}

let pendingMigrations = [];
let db;

async function init(_db) {
    db = _db;
    // Ensure the metadata table exists
    MetaVersion.init({
        version: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        sequelize: db.sequelize,
        modelName: 'MetaVersion',
        timestamps: true,
        createdAt: false
    });
    await MetaVersion.sync()

    await checkPendingMigrations()
}

async function checkPendingMigrations() {
    const currentVersion = await MetaVersion.findOne({order:[['id','DESC']]});
    let files = await fs.readdir(MIGRATIONS_DIR);
    files = files.filter(name => /^\d\d.*\.js$/.test(name));
    files.sort();

    // If version is null, then all migrations are needed
    let found = !currentVersion;
    pendingMigrations = files.filter(name => {
        if (found) { return true }
        if (name === currentVersion.version) {
            found = true;
        }
    })
}
async function applyMigration(filename) {
    const queryInterface = db.sequelize.getQueryInterface();
    const migration = require("./"+filename);
    console.log("Applying",filename);
    await migration.up(queryInterface);
    await MetaVersion.create({ version: filename });
}
async function applyPendingMigrations() {
    if (pendingMigrations.length > 0) {
        console.log("Applying migrations",pendingMigrations)
        for (let i=0; i<pendingMigrations.length; i++) {
            await applyMigration(pendingMigrations[i]);
        }
        console.log("Finished applying migrations")
        await checkPendingMigrations()
    } else {
        console.log("No pending migrations")
    }
}

module.exports = {
    init,
    hasPendingMigrations: _ => pendingMigrations.length > 0,
    applyPendingMigrations
}
