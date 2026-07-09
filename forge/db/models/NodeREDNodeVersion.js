/**
 * Which nodes are installed in which Instances
 * @namespace forge.db.models.NodeREDNodeVersion
 * // type helpers for design time help and error checking
 * @typedef {import('sequelize').Model} Model
 * @typedef {import('sequelize').ModelAttributes} ModelAttributes
 * @typedef {import('sequelize').SchemaOptions} SchemaOptions
 * @typedef {import('sequelize').ModelIndexesOptions} ModelIndexesOptions
 * @typedef {import('sequelize').InitOptions} InitOptions
 * @typedef {import('sequelize').ModelScopeOptions} ModelScopeOptions
 * @typedef {{name: string, schema: ModelAttributes, model: Model, indexes?: ModelIndexesOptions[], scopes?: ModelScopeOptions, options?: InitOptions}} FFModel
 */

const { DataTypes } = require('sequelize');

/** @type {FFModel} */
module.exports = {
    name: 'NodeREDNodeVersion',
    schema: {
        ownerId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        ownerType: {
            type: DataTypes.STRING,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        currentVersion: {
            type: DataTypes.STRING,
            allowNull: false
        },
        latestVersion: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    indexes: [],
    associations: function (M) {
        this.belongsTo(M.Project, { foreignKey: 'ownerId', constraints: false })
        this.belongsTo(M.Device, { foreignKey: 'ownerId', constraints: false })
    },
    finders: function (M) {
        return {
            static: {},
            instance: {}
        }
    }
}