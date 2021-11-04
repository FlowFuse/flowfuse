/**
 * Forge Platform settings
 *
 * @namespace forge.db.models.PlatformSettings
 */

const { DataTypes } = require('sequelize');

const SettingTypes = {
    'STRING': 0,
    'JSON': 1
}

module.exports = {
    name: 'PlatformSettings',
    schema: {
        key: { primaryKey: true, type: DataTypes.STRING, allowNull: false },
        value: {
            type: DataTypes.STRING,
            get() {
                const rawValue = this.getDataValue('value');
                const valueType = this.getDataValue('valueType');
                if (rawValue === null || valueType === 0) {
                    return rawValue;
                }
                return JSON.parse(rawValue)
            },
            set(value) {
                if (typeof value === "string" || value === null || value === undefined) {
                    this.setDataValue("value", value);
                    this.setDataValue("valueType", SettingTypes.STRING)
                    return;
                }
                this.setDataValue("value", JSON.stringify(value));
                this.setDataValue("valueType", SettingTypes.JSON)
            }
        },
        valueType: { type: DataTypes.INTEGER, allowNull: false}
    },
    hooks: {
        beforeUpdate: (user) => {
            if (user.avatar.startsWith(`${process.env.BASE_URL}/avatar/`)) {
                user.avatar = generateUserAvatar(user.name || user.username);
            }
        }
    },
}
