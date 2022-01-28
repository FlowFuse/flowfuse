/**
 * An Organization
 *
 * @namespace forge.db.models.Organization
 */

const { DataTypes } = require('sequelize')

module.exports = {
    name: 'Organization',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false }
    },
    scopes: {
        admins: { where: { admin: true } }
    },
    finders: function () {
        const self = this
        return {
            static: {
                byName: async function (name) {
                    return self.findOne({ where: { name } })
                }
            }
        }
    }
}
