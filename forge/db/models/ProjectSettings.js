/**
 * A Project
 * @namespace forge.db.models.ProjectSettings
 */
const { DataTypes } = require('sequelize');

const SettingTypes = {
    'STRING': 0,
    'JSON': 1
}

module.exports = {
    name: 'ProjectSettings',
    schema: {
        ProjectId: { type: DataTypes.UUID, unique: 'pk_settings'},
        key: { type: DataTypes.STRING, allowNull: false, unique: 'pk_settings'},
        value: {
            type: DataTypes.TEXT,
            get() {
                const rawValue = this.getDataValue('value');
                const valueType = this.getDataValue('valueType');
                if (rawValue === undefined || rawValue === null || valueType === 0) {
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
    associations: function(M) {
        this.belongsTo(M['Project'])
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    }
}
