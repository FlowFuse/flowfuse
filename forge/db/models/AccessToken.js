const { DataTypes } = require('sequelize');
const { uppercaseFirst, sha256 } = require("../utils")


module.exports = {
    name: 'AccessToken',
    schema: {
        token: {
            type: DataTypes.STRING, primaryKey: true, allowNull: false,
            set(value) {
                this.setDataValue('token', sha256(value));
            }
        },
        expiresAt: { type: DataTypes.DATE },
        scope: {
            type: DataTypes.STRING,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue('scope');
                return rawValue.split(",");
            },
            set(value) {
                if (Array.isArray(value)) {
                    this.setDataValue('scope', value.join(","));
                } else {
                    this.setDataValue('scope', value)
                }
            }
        },
        ownerId: { type: DataTypes.STRING },
        ownerType: { type: DataTypes.STRING }
    },
    associations: function(M) {
        this.belongsTo(M['Project'], { foreignKey: 'ownerId', constraints: false });
    },
    finders: function(M) {
        return {
            getOwner(options) {
                if (!this.ownerType) return Promise.resolve(null);
                const mixinMethodName = `get${uppercaseFirst(this.ownerType)}`;
                return this[mixinMethodName](options);
            }
        }
    }
}
