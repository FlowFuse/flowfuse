/**
 * An auth client
 * @namespace forge.db.models.AuthClient
 */

const { DataTypes } = require('sequelize')

const { hash, uppercaseFirst } = require('../utils')

module.exports = {
    name: 'AuthClient',
    schema: {
        clientID: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
        clientSecret: {
            type: DataTypes.STRING,
            set (value) {
                this.setDataValue('clientSecret', hash(value))
            }
        },
        ownerId: { type: DataTypes.STRING },
        ownerType: { type: DataTypes.STRING }
    },
    associations: function (M) {
        this.belongsTo(M.Project, { foreignKey: 'ownerId', constraints: false })
        // Also belongsTo Device - but not adding the association as we don't
        // want the sequelize mixins to be added to the Device model - they don't
        // handle the casting from int to string for the deviceId/ownerId
    },
    finders: function (M) {
        return {
            getOwner (options) {
                if (!this.ownerType) return Promise.resolve(null)
                const mixinMethodName = `get${uppercaseFirst(this.ownerType)}`
                return this[mixinMethodName](options)
            }
        }
    }
}
