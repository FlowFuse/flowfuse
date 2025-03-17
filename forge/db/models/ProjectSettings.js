/**
 * A Project Settings model
 * @namespace forge.db.models.ProjectSettings
 */
const { DataTypes } = require('sequelize')

const SettingTypes = {
    STRING: 0,
    JSON: 1
}

const KEY_SETTINGS = 'settings'
const KEY_HOSTNAME = 'hostname'
const KEY_HA = 'ha'
const KEY_PROTECTED = 'protected'
const KEY_HEALTH_CHECK_INTERVAL = 'healthCheckInterval'
const KEY_CUSTOM_HOSTNAME = 'customHostname'
const KEY_SHARED_ASSETS = 'sharedAssets'
const KEY_DISABLE_AUTO_SAFE_MODE = 'disableAutoSafeMode'

module.exports = {
    KEY_SETTINGS,
    KEY_HOSTNAME,
    KEY_HA,
    KEY_PROTECTED,
    KEY_HEALTH_CHECK_INTERVAL,
    KEY_CUSTOM_HOSTNAME,
    KEY_SHARED_ASSETS,
    KEY_DISABLE_AUTO_SAFE_MODE,
    name: 'ProjectSettings',
    schema: {
        ProjectId: { type: DataTypes.UUID, unique: 'pk_settings' },
        key: { type: DataTypes.STRING, allowNull: false, unique: 'pk_settings' },
        value: {
            type: DataTypes.TEXT,
            get () {
                const rawValue = this.getDataValue('value')
                const valueType = this.getDataValue('valueType')
                if (rawValue === undefined || rawValue === null || valueType === 0) {
                    return rawValue
                }
                return JSON.parse(rawValue)
            },
            set (value) {
                if (typeof value === 'string' || value === null || value === undefined) {
                    this.setDataValue('value', value)
                    this.setDataValue('valueType', SettingTypes.STRING)
                    return
                }
                this.setDataValue('value', JSON.stringify(value))
                this.setDataValue('valueType', SettingTypes.JSON)
            }
        },
        valueType: { type: DataTypes.INTEGER, allowNull: false }
    },
    associations: function (M) {
        this.belongsTo(M.Project)
    },
    finders: function (M) {
        return {
            static: {
                isHostnameUsed: async (hostname) => {
                    const count = await this.count({
                        where: { key: KEY_HOSTNAME, value: hostname.toLowerCase() }
                    })
                    return count !== 0
                },
                isCustomHostnameUsed: async (hostname) => {
                    const count = await this.count({
                        where: { key: KEY_CUSTOM_HOSTNAME, value: hostname.toLowerCase() }
                    })
                    return count !== 0 || this.isHostnameUsed(hostname)
                }
            }
        }
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    }
}
