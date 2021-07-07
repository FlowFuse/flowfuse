/**
 * An active login session
 * @namespace forge.db.models.Session
 */

const { DataTypes } = require('sequelize');

module.exports = {
    name: 'Session',
    schema: {
        sid: { type: DataTypes.STRING, primaryKey: true, allowNull: false, validate: {
            len: [64,128]
        }},
        expiresAt: { type: DataTypes.DATE, allowNull: false }
    },
    associations: function(M) {
        this.belongsTo(M['User']);
    }
}
