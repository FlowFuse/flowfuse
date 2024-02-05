const { DataTypes } = require('sequelize')

module.exports = {
    name: 'OAuthSession',
    schema: {
        id: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        value: {
            type: DataTypes.TEXT,
            get () {
                const rawValue = this.getDataValue('value')
                return JSON.parse(rawValue)
            },
            set (value) {
                this.setDataValue('value', JSON.stringify(value))
            }
        }
    },
    finders: function (M) {
        return {
            static: {
                getAndRemoveById: async (id) => {
                    const cachedValue = await this.findOne({
                        where: { id }
                    })
                    let result = null
                    if (cachedValue) {
                        // Only return values if this object was created under five minutes ago
                        if (Date.now() - cachedValue.createdAt.getTime() < 1000 * 60 * 5) {
                            result = cachedValue.value
                        }
                        // These are single use - so always destroy
                        await cachedValue.destroy()
                    }
                    return result
                }
            }
        }
    }
}
