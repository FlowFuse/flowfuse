const { sha256 } = require('../utils')
/**
 * An active login session
 * @namespace forge.db.models.Session
 */

const { DataTypes } = require('sequelize')

module.exports = {
    name: 'Session',
    schema: {
        sid: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        refreshToken: {
            type: DataTypes.STRING,
            set (value) {
                this.setDataValue('refreshToken', sha256(value))
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.User)
    },
    finders: function (M) {
        return {
            static: {
                byRefreshToken: async (refreshToken) => {
                    const hashedToken = sha256(refreshToken)
                    return await this.findOne({ where: { refreshToken: hashedToken } })
                }
            }
        }
    }
}
