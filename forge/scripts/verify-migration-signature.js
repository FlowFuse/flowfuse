#!/usr/bin/env node

// This script checks the models defined in forge/db/models generates
// tables that match what the migrations generate
//
// If there is a mismatch, it means the models have been changed
// but there is no migration file provided to handle it.


const { sha256 } = require("../db/utils")
const fastify = require('fastify');
const db = require('../db');
const fs = require("fs").promises;
const path = require("path");

const MIGRATIONS_DIR = path.resolve(path.join(__dirname, "../db/migrations" ));

/**
 * Create a clean in-memory database using the models.
 */
async function setupDatabase() {
    const app = fastify()
    process.env.DB_TYPE = "sqlite";
    process.env.DP_SQLITE_STORAGE = ":memory:"
    await app.register(db);
    await app.db.init({skipMigrationCheck: true});
    return app;
}

async function getCurrentSchemaVersions(app) {
    const q = app.db.sequelize.getQueryInterface();
    let tables = await q.showAllSchemas()
    tables = tables.map(t => t.name);
    tables.sort();
    const result = {};

    for (let i=0; i<tables.length; i++) {
        let schema = await q.describeTable(tables[i]);
        // console.log(tables[i],schema);
        result[tables[i]] = sha256(JSON.stringify(schema))
    }
    return result;
}

async function getExpectedSchemaVersions() {
    let files = await fs.readdir(MIGRATIONS_DIR);
    if (files.length === 0) {
        throw new Error("No migration files found in",MIGRATIONS_DIR);
    }
    files = files.filter(name => /^\d\d.*\.js$/.test(name));
    files.sort();

    const schemaVersions = { };

    for (const file of files) {
        const pathToFile = path.relative(__dirname, path.join(MIGRATIONS_DIR, file));
        const migration = require(pathToFile);
        const migrationVersions = migration.versions || {};
        for (const table in migrationVersions) {
            schemaVersions[table] = migrationVersions[table]
        }
    }
    return schemaVersions;
}

(async function() {
    const expectedVersions = await getExpectedSchemaVersions();
    const expectedTables = Object.keys(expectedVersions);

    const app = await setupDatabase();
    const currentVersions = await getCurrentSchemaVersions(app);
    const currentTables = Object.keys(currentVersions);

    const errors = [];

    for (const table of expectedTables) {
        if (!currentVersions[table]) {
            errors.push(`Table not created: '${table}'`)
        } else if (currentVersions[table] !== expectedVersions[table]) {
            errors.push(`Table '${table}' signature changed.\n\tExpected ${expectedVersions[table]}\n\tActual ${currentVersions[table]}`)
        }
    }
    for (const table of currentTables) {
        if (!expectedVersions[table]) {
            errors.push(`Table '${table}' missing signature.\n\tExpected ${currentVersions[table]}`)
        }
    }
    if (errors.length > 0) {
        for (const error of errors) {
            console.log(error)
        }
        process.exitCode = 1;
    }
})()
