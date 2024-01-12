const { DataTypes } = require('sequelize')

module.exports = {
    name: 'CommandResponse',
    schema: {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        payload: {
            type: DataTypes.TEXT
        }
    },
    finders: function (M) {
        return {
            static: {
                byId: async (id) => {
                    return this.findOne({
                        where: { id }
                    })
                }
            }
        }
    }
}
