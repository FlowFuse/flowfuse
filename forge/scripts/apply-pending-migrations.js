#!/usr/bin/env node

const fastify = require('fastify');
const config = require("../config");
const db = require('../db');

async function connectDatabase() {
    const app = fastify()
    // Config : loads environment configuration
    await app.register(config);
    await app.register(db);
    return app;
}

(async function() {
    const app = await connectDatabase();
    await app.db.migrations.applyPendingMigrations()
})()
