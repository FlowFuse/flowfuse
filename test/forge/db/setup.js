
const fastify = require('fastify');
const db = require('../../../forge/db');



module.exports = async function() {
    const app = fastify()

    process.env.DB_TYPE = "sqlite";
    process.env.DP_SQLITE_STORAGE = ":memory:"
    await app.register(db);
    return app;
}
