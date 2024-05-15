/* eslint-disable no-unused-vars */
/**
 * This migration ensures that all EE tables exist in the correct state.
 * This is only relevant for users running OSS version who installed <2.1.0.
 * We introduced the baseline migration at 2.1.0 that, for new installs, ensures
 * all tables exist. However it was intended for clean installs, rather than
 * moving older installs forward.
 *
 * For each EE model, we need to check the table exists. If it doesn't, we need to
 * replay the corresponding migration to create the table, plus any subsequent migrations
 * that have updated the model.
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        // EE only models:

        // MFAToken
        if (!await context.tableExists('MFATokens')) {
            // Rerun the create table migration
            await require('./20231109-02-EE-add-mfatoken-table.js').up(context)
            // No further modifications needed
        }
        // SAMLProvider
        if (!await context.tableExists('SAMLProviders')) {
            // Rerun the create table migration
            await require('./20221214-01-add-samlprovider-table.js').up(context)
            // No further modifications needed
        }
        // StorageSharedLibrary
        if (!await context.tableExists('StorageSharedLibraries')) {
            // Rerun the create table migration
            await require('./20221214-01-add-storagesharedlibrary-table.js').up(context)
            // No further modifications needed
        }
        // UserBillingCode
        if (!await context.tableExists('UserBillingCodes')) {
            // Rerun the create table migration
            await require('./20230328-01-add-userbillingcode-table.js').up(context)
            // No further modifications needed
        }
        // FlowTemplate
        if (!await context.tableExists('FlowTemplates')) {
            // Rerun the create table migration
            await require('./20231006-01-create-flow-template-table.js').up(context)
            // Rerun later migrations that patch the table
            await require('./20231207-01-EE-add-to-flow-template-table.js').up(context)
            await require('./20240325-01-add-teamTypeScope-to-FlowTemplates.js').up(context)
        }

        // Subscription
        if (!await context.tableExists('Subscriptions')) {
            // Subscriptions were introduced without a migration - before we
            // established the proper procedure for adding models. So need creating
            // the table to match the baseline
            await context.createTable('Subscriptions', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                customer: { type: DataTypes.STRING, allowNull: false },
                subscription: { type: DataTypes.STRING, allowNull: false },
                status: {
                    type: DataTypes.ENUM(['active', 'canceled', 'past_due', 'trial', 'unmanaged']),
                    allowNull: false,
                    defaultValue: 'active'
                },
                trialStatus: {
                    type: DataTypes.ENUM(['none', 'created', 'week_email_sent', 'day_email_sent', 'ended']),
                    allowNull: false,
                    defaultValue: 'none'
                },
                trialEndsAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    defaultValue: null
                },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false },
                TeamId: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    defaultValue: null,
                    references: { model: 'Teams', key: 'id' },
                    onDelete: 'SET NULL',
                    onUpdate: 'CASCADE'
                }
            })
        }

        // Pipeline
        // PipelineStage
        // PipelineStageInstance
        if (!await context.tableExists('Pipelines')) {
            // These three tables all get handled by the same migration
            await require('./20230919-01-add-action-to-pipeline-stage.js').up(context)
        }

        // PipelineStageDeviceGroup
        if (!await context.tableExists('PipelineStageDeviceGroups')) {
            // Another table that was introduced without a migration
            await context.createTable('PipelineStageDeviceGroups', {
                PipelineStageId: {
                    type: DataTypes.INTEGER,
                    primaryKey: 'pk',
                    allowNull: false,
                    references: { model: 'PipelineStages', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE'
                },
                DeviceGroupId: {
                    type: DataTypes.INTEGER,
                    primaryKey: 'pk',
                    allowNull: false,
                    references: { model: 'DeviceGroups', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE'
                },
                targetSnapshotId: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    defaultValue: null,
                    references: { model: 'ProjectSnapshots', key: 'id' },
                    onDelete: 'SET NULL',
                    onUpdate: 'CASCADE'
                }
            })
        }
    },
    down: async (context) => {
    }
}
