const process = require('process')

module.exports = async (app) => {
    return {
        'env.nodejs': process.version,
        'env.flowforge': app.config.version
    }
}
