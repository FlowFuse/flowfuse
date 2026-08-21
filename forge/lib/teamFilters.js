const { Op } = require('sequelize')

/**
 * Build the sequelize where clause for an admin team listing from the request
 * query, so every route that lists or counts teams applies the same filters.
 *
 * Recognised query properties:
 *  - teamType: comma separated team type hashids
 *  - state: 'suspended' for only suspended teams, 'active' to exclude them
 *  - billing: comma separated subscription statuses (ignored when filtering on
 *    suspended teams, and only when billing is available)
 *
 * @param {Object} app the forge app
 * @param {Object} query the request query
 * @returns {Object} a sequelize where clause
 */
function buildTeamFilterWhere (app, query = {}) {
    const where = {}
    const filters = []
    if (query.teamType) {
        const teamTypes = query.teamType.split(',').map(app.db.models.TeamType.decodeHashid).flat()
        filters.push({ TeamTypeId: { [Op.in]: teamTypes } })
    }
    if (query.state === 'suspended') {
        filters.push({ suspended: true })
    } else {
        if (query.state === 'active') {
            filters.push({ suspended: false })
        }
        if (app.billing && query.billing) {
            filters.push({ suspended: false })
            const billingStates = query.billing.split(',')
            filters.push({ '$Subscription.status$': { [Op.in]: billingStates } })
        }
    }
    if (filters.length > 0) {
        where[Op.and] = filters
    }
    return where
}

module.exports = {
    buildTeamFilterWhere
}
