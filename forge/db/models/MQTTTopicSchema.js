/**
 * Stores topics from brokers to build schema
 */

const { DataTypes } = require('sequelize')

const { buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'MQTTTopicSchema',
    schema: {
        topic: { type: DataTypes.STRING, allowNull: false },
        metadata: { type: DataTypes.TEXT, allowNull: true }
    },
    indexes: [
        { name: 'topic_team_broker_unique', fields: ['topic', 'TeamId', 'BrokerCredentialsId'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.Team, { foreignKey: { allowNull: false } })
        this.belongsTo(M.BrokerCredentials, { as: 'BrokerCredentials', foreignKey: { allowNull: true } })
    },
    finders: function (M, app) {
        return {
            static: {
                byId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.MQTTTopicSchema.decodeHashid(id)
                    }
                    return this.findOne({
                        where: { id },
                        include: [
                            {
                                model: M.Team
                            },
                            {
                                model: M.BrokerCredentials,
                                as: 'BrokerCredentials'
                            }
                        ]
                    })
                },
                byBroker: async (brokerId, pagination = {}, where = {}) => {
                    if (brokerId === 'team') {
                        throw new Error('use getTeamBroker')
                    }
                    if (typeof brokerId === 'string') {
                        brokerId = M.BrokerCredentials.decodeHashid(brokerId)
                    }
                    const limit = Math.min(parseInt(pagination.limit) || 100, 100)
                    if (pagination.cursor) {
                        pagination.cursor = M.MQTTTopicSchema.decodeHashid(pagination.cursor)
                    }
                    where.BrokerCredentialsId = brokerId
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, [])
                        }),
                        this.count({
                            where
                        })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        topics: rows
                    }
                },
                getTeamBroker: async (teamId, pagination = {}, where = {}) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    const limit = Math.min(parseInt(pagination.limit) || 100, 100)
                    if (pagination.cursor) {
                        pagination.cursor = M.MQTTTopicSchema.decodeHashid(pagination.cursor)
                    }
                    where.TeamId = teamId
                    where.BrokerCredentialsId = app.settings.get('team:broker:creds')
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, [])
                        }),
                        this.count({
                            where
                        })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        topics: rows
                    }
                }
            }
        }
    }
}
