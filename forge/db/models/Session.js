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
        idleAt: { type: DataTypes.DATE },
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
