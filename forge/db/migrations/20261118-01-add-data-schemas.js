/**
 * Create the DataSchemaGroups, DataSchemas and DataSchemaVersions tables for the team schema registry
 */

const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.createTable('DataSchemaGroups', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        })
        await context.addIndex('DataSchemaGroups', {
            name: 'data_schema_groups_team_name_unique',
            fields: ['TeamId', 'name'],
            unique: true
        })

        await context.createTable('DataSchemas', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                allowNull: false
            },
            DataSchemaGroupId: {
                type: DataTypes.INTEGER,
                references: { model: 'DataSchemaGroups', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
                allowNull: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        })
        // Names are unique across the team, not per group
        await context.addIndex('DataSchemas', {
            name: 'data_schemas_team_name_unique',
            fields: ['TeamId', 'name'],
            unique: true
        })

        await context.createTable('DataSchemaVersions', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            DataSchemaId: {
                type: DataTypes.INTEGER,
                references: { model: 'DataSchemas', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                allowNull: false
            },
            version: {
                type: DataTypes.STRING,
                allowNull: true
            },
            major: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            minor: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            patch: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            schema: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            format: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'json-schema-2020-12'
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            status: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'draft'
            },
            CreatedById: {
                type: DataTypes.INTEGER,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
                allowNull: true
            },
            PublishedById: {
                type: DataTypes.INTEGER,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
                allowNull: true
            },
            publishedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        })
        // A draft has a null version, and nulls do not collide in a unique index
        await context.addIndex('DataSchemaVersions', {
            name: 'data_schema_versions_schema_version_unique',
            fields: ['DataSchemaId', 'version'],
            unique: true
        })
        // At most one draft per schema
        await context.addIndex('DataSchemaVersions', {
            name: 'data_schema_versions_one_draft',
            fields: ['DataSchemaId'],
            unique: true,
            where: { status: 'draft' }
        })
        await context.addIndex('DataSchemaVersions', {
            name: 'data_schema_versions_order',
            fields: ['DataSchemaId', 'major', 'minor', 'patch']
        })
    },
    down: async (context) => {}
}
