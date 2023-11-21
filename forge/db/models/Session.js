const { DataTypes } = require('sequelize')

const { sha256 } = require('../utils')
/**
 * An active login session
 * @namespace forge.db.models.Session
 */

module.exports = {
    name: 'Session',
    schema: {
        sid: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        idleAt: { type: DataTypes.DATE },
        mfa_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
        refreshToken: {
            type: DataTypes.STRING,
            set (value) {
                this.setDataValue('refreshToken', sha256(value))
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.User)
    }
}
