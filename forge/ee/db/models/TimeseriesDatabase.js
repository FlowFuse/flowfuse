/**
 * A team's time-series database: a QuestDB server either created by the timeseries driver
 * (`kind: managed`) or run by the customer and connected by the team owner (`kind: external`)
 */
const { DataTypes } = require('sequelize')

const { encryptValue, decryptValue } = require('../../../db/utils')

const KINDS = ['managed', 'external']
const STATES = ['provisioning', 'ready', 'error', 'suspended', 'deleting']

function jsonColumn (column) {
    return {
        type: DataTypes.TEXT,
        set (value) {
            this.setDataValue(column, JSON.stringify(value ?? {}))
        },
        get () {
            return JSON.parse(this.getDataValue(column) || '{}')
        }
    }
}

module.exports = {
    name: 'TimeseriesDatabase',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        kind: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [KINDS] } },
        state: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [STATES] } },
        stateDetail: { type: DataTypes.TEXT },
        tier: { type: DataTypes.STRING },
        image: { type: DataTypes.STRING },
        endpoints: jsonColumn('endpoints'),
        // Encrypted JSON, read and written through getCredentials/setCredentials only
        credentials: { type: DataTypes.TEXT },
        meta: jsonColumn('meta')
    },
    associations: function (M) {
        this.belongsTo(M.Team, { onDelete: 'CASCADE' })
    },
    finders: function (M, app) {
        const self = this
        function secret () {
            const value = app.settings.get('timeseriesSecret')
            if (!value) {
                throw new Error('timeseriesSecret is not set')
            }
            return value
        }
        return {
            static: {
                KINDS,
                STATES,
                byTeamId: async (teamId) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)[0]
                    }
                    if (!teamId) {
                        return null
                    }
                    return self.findOne({ where: { TeamId: teamId }, include: [{ model: M.Team }] })
                },
                byId: async (teamId, databaseId) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)[0]
                    }
                    if (typeof databaseId === 'string') {
                        databaseId = self.decodeHashid(databaseId)[0]
                    }
                    if (!teamId || !databaseId) {
                        return null
                    }
                    return self.findOne({ where: { id: databaseId, TeamId: teamId }, include: [{ model: M.Team }] })
                },
                // Ready managed servers, for the PgBouncer team list
                readyManaged: async () => {
                    return self.findAll({ where: { kind: 'managed', state: 'ready' }, include: [{ model: M.Team }] })
                }
            },
            instance: {
                getCredentials () {
                    const raw = this.getDataValue('credentials')
                    if (!raw) {
                        return {}
                    }
                    return JSON.parse(decryptValue(secret(), raw))
                },
                setCredentials (value) {
                    this.setDataValue('credentials', encryptValue(secret(), JSON.stringify(value ?? {})))
                }
            }
        }
    }
}
