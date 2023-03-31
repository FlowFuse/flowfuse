/**
 * PromoCodes that are associated with a User.
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'UserBillingCode',
    schema: {
        code: { type: DataTypes.STRING }
    },
    associations: function (M) {
        this.belongsTo(M.User, {
            onDelete: 'CASCADE'
        })
    },
    finders: function (M) {
        return {
            static: {
                byUser: async (user) => {
                    return this.findOne({
                        where: {
                            UserId: user.id
                        }
                    })
                }
            }
        }
    }
}
