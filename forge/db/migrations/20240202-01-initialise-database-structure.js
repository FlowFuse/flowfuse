const { DataTypes } = require('sequelize')
/**
 * This migration creates the entire FlowFuse database structure in an empty
 * database.
 *
 * Previously, for new installs, we relied on Sequelize.sync() to do the work
 * to create the database structure and we didn't use any migrations.
 *
 * Starting with FlowFuse 2.1, we have changed this strategy. We no longer use
 * sequelize.sync to do it for us. Instead, the platform will apply all migrations
 * starting with this one (all earlier migrations are skipped).
 */
module.exports = {
    up: async (context) => {
        // This migration is considered the starting point for any new installs
        // of FlowFuse.
        // This should only be run if there is no existing database structure.

        // Rather than do this for each table, we'll use the Users table as
        // the canary in the coal mine.
        if (await context.tableExists('Users')) {
            return
        }

        // TeamTypes
        await context.createTable('TeamTypes', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, unique: true, allowNull: false },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            order: { type: DataTypes.INTEGER, defaultValue: 0 },
            description: { type: DataTypes.TEXT },
            properties: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })
        // Teams
        await context.createTable('Teams', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, allowNull: false },
            slug: { type: DataTypes.STRING, unique: true },
            avatar: { type: DataTypes.STRING },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            TeamTypeId: {
                // CHECK ME,
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'TeamTypes', key: 'id' },
                // CHECK ME,
                onDelete: 'SET NULL',
                // CHECK ME,
                onUpdate: 'CASCADE'
            }
        })

        // Users
        await context.createTable('Users', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            username: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING },
            email: { type: DataTypes.STRING, unique: true },
            email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
            sso_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
            mfa_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
            password: { type: DataTypes.STRING },
            password_expired: { type: DataTypes.BOOLEAN, defaultValue: false },
            admin: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            avatar: { type: DataTypes.STRING },
            tcs_accepted: { type: DataTypes.DATE, allowNull: true },
            suspended: { type: DataTypes.BOOLEAN, defaultValue: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            defaultTeamId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        await context.addIndex('Users', { name: 'user_username_lower_unique', fields: [context.sequelize.fn('lower', context.sequelize.col('username'))], unique: true })
        await context.addIndex('Users', { name: 'user_email_lower_unique', fields: [context.sequelize.fn('lower', context.sequelize.col('email'))], unique: true })

        // TeamMembers
        await context.createTable('TeamMembers', {
            role: { type: DataTypes.INTEGER, allowNull: false },
            UserId: {
                // CHECK ME,
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                // CHECK ME,
                onDelete: 'CASCADE',
                // CHECK ME,
                onUpdate: 'CASCADE'
            },
            TeamId: {
                // CHECK ME,
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                defaultValue: null,
                references: { model: 'Teams', key: 'id' },
                // CHECK ME,
                onDelete: 'CASCADE',
                // CHECK ME,
                onUpdate: 'CASCADE'
            }
        })

        // Invitations
        await context.createTable('Invitations', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            token: { type: DataTypes.STRING, unique: true },
            external: { type: DataTypes.BOOLEAN, allowNull: false },
            expiresAt: { type: DataTypes.DATE },
            email: { type: DataTypes.STRING, allowNull: true },
            sentAt: { type: DataTypes.DATE, allowNull: true },
            role: { type: DataTypes.INTEGER },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            invitorId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            inviteeId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            teamId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // Applications
        await context.createTable('Applications', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, allowNull: false },
            description: { type: DataTypes.STRING, defaultValue: '' },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            TeamId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: null,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })

        // ProjectTypes
        await context.createTable('ProjectTypes', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            order: { type: DataTypes.INTEGER, defaultValue: 0 },
            description: { type: DataTypes.TEXT },
            properties: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
            // defaultStackId : added after ProjectStacks is created
        })
        // ProjectStacks
        await context.createTable('ProjectStacks', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            label: { type: DataTypes.STRING },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            properties: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ProjectTypeId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'ProjectTypes', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            replacedBy: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'ProjectStacks', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        await context.addColumn('ProjectTypes', 'defaultStackId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            // TODO: this may be an issue as we have a circular ref with ProjectStacks table below
            references: { model: 'ProjectStacks', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        })

        // ProjectTemplates
        await context.createTable('ProjectTemplates', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            description: { type: DataTypes.TEXT, defaultValue: '' },
            settings: { type: DataTypes.TEXT },
            policy: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ownerId: {
                // CHECK ME,
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                // CHECK ME,
                onDelete: 'SET NULL',
                // CHECK ME,
                onUpdate: 'CASCADE'
            }
        })

        /**
         *
         *
         *
         *
         *
         *
         */

        // PlatformSettings
        await context.createTable('PlatformSettings', {
            key: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            value: { type: DataTypes.TEXT },
            valueType: { type: DataTypes.INTEGER, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })

        // Sessions
        await context.createTable('Sessions', {
            sid: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            expiresAt: { type: DataTypes.DATE, allowNull: false },
            idleAt: { type: DataTypes.DATE },
            mfa_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
            refreshToken: { type: DataTypes.STRING },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            UserId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // Projects
        await context.createTable('Projects', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true
            },
            name: { type: DataTypes.STRING, allowNull: false },
            type: { type: DataTypes.STRING, allowNull: false },
            url: { type: DataTypes.STRING, allowNull: false },
            state: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'running'
            },
            safeName: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ApplicationId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Applications', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            TeamId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            ProjectTypeId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'ProjectTypes', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            ProjectStackId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'ProjectStacks', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            ProjectTemplateId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'ProjectTemplates', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })
        await context.addIndex('Projects', { name: 'projects_safe_name_unique', fields: ['safeName'], unique: true })

        // ProjectSettings
        await context.createTable('ProjectSettings', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            ProjectId: {
                type: DataTypes.UUID,
                unique: 'pk_settings',
                allowNull: true,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            key: {
                type: DataTypes.STRING,
                unique: 'pk_settings',
                allowNull: false
            },
            value: { type: DataTypes.TEXT },
            valueType: { type: DataTypes.INTEGER, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        }, {
            uniqueKeys: {
                pk_settings: {
                    fields: ['ProjectId', 'key']
                }
            }
        })

        // ProjectSnapshots
        await context.createTable('ProjectSnapshots', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            settings: { type: DataTypes.TEXT },
            flows: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            UserId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
            // DeviceId: added after Devices created
        })

        // AccessTokens
        await context.createTable('AccessTokens', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            token: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            expiresAt: { type: DataTypes.DATE },
            scope: { type: DataTypes.STRING, allowNull: false },
            ownerId: { type: DataTypes.STRING, allowNull: true },
            ownerType: { type: DataTypes.STRING },
            refreshToken: { type: DataTypes.STRING },
            name: { type: DataTypes.STRING },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })

        // AuthClients
        await context.createTable('AuthClients', {
            clientID: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            clientSecret: { type: DataTypes.STRING },
            ownerId: { type: DataTypes.STRING, allowNull: true },
            ownerType: { type: DataTypes.STRING },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })

        // DeviceGroups
        await context.createTable('DeviceGroups', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, allowNull: false },
            description: { type: DataTypes.TEXT },
            targetSnapshotId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: 'ProjectSnapshots', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ApplicationId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Applications', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })

        // Devices
        await context.createTable('Devices', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, allowNull: false },
            type: { type: DataTypes.STRING, allowNull: false },
            credentialSecret: { type: DataTypes.STRING, allowNull: false },
            state: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ''
            },
            lastSeenAt: { type: DataTypes.DATE, allowNull: true },
            settingsHash: { type: DataTypes.STRING, allowNull: true },
            agentVersion: { type: DataTypes.STRING, allowNull: true },
            mode: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: 'autonomous'
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
            },
            targetSnapshotId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'ProjectSnapshots', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            activeSnapshotId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'ProjectSnapshots', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            ApplicationId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Applications', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            DeviceGroupId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'DeviceGroups', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        await context.addColumn('ProjectSnapshots', 'DeviceId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            references: { model: 'Devices', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        })

        // DeviceSettings
        await context.createTable('DeviceSettings', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            DeviceId: {
                type: DataTypes.INTEGER,
                unique: 'pk_settings',
                allowNull: true,
                references: { model: 'Devices', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            key: {
                type: DataTypes.STRING,
                unique: 'pk_settings',
                allowNull: false
            },
            value: { type: DataTypes.TEXT },
            valueType: { type: DataTypes.INTEGER, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        }, {
            uniqueKeys: {
                pk_settings: {
                    fields: ['DeviceId', 'key']
                }
            }
        })

        // StorageFlows
        await context.createTable('StorageFlows', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            flow: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: '[]'
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // StorageCredentials
        await context.createTable('StorageCredentials', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            credentials: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: '{}'
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // StorageSettings
        await context.createTable('StorageSettings', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            settings: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: '{}'
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // StorageSessions
        await context.createTable('StorageSessions', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            sessions: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: '{}'
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // StorageLibraries
        await context.createTable('StorageLibraries', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.TEXT, allowNull: false },
            type: { type: DataTypes.TEXT, allowNull: false },
            meta: { type: DataTypes.TEXT, allowNull: true },
            body: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: ''
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // AuditLogs
        await context.createTable('AuditLogs', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            event: { type: DataTypes.STRING },
            body: { type: DataTypes.TEXT },
            entityId: { type: DataTypes.STRING },
            entityType: { type: DataTypes.STRING },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            UserId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            ownerId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null
            }
        })

        // BrokerClients
        await context.createTable('BrokerClients', {
            username: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            password: { type: DataTypes.STRING, allowNull: false },
            ownerId: { type: DataTypes.STRING },
            ownerType: { type: DataTypes.STRING },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })

        // OAuthSessions
        await context.createTable('OAuthSessions', {
            id: { type: DataTypes.STRING, primaryKey: true },
            value: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })

        // Subscriptions
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

        // SAMLProviders
        await context.createTable('SAMLProviders', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, allowNull: false },
            domainFilter: { type: DataTypes.STRING, allowNull: false },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            options: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })

        // StorageSharedLibraries
        await context.createTable('StorageSharedLibraries', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.TEXT, allowNull: false },
            type: { type: DataTypes.TEXT, allowNull: false },
            meta: { type: DataTypes.TEXT, allowNull: true },
            body: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: ''
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            TeamId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })

        // UserBillingCodes
        await context.createTable('UserBillingCodes', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            code: { type: DataTypes.STRING },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            UserId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })

        // Pipelines
        await context.createTable('Pipelines', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            ApplicationId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Applications', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // PipelineStages
        await context.createTable('PipelineStages', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, allowNull: false },
            deployToDevices: { type: DataTypes.BOOLEAN },
            action: {
                type: DataTypes.ENUM(['create_snapshot', 'use_active_snapshot', 'use_latest_snapshot', 'prompt']),
                allowNull: false,
                defaultValue: 'create_snapshot'
            },
            NextStageId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: 'PipelineStages', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            PipelineId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Pipelines', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // PipelineStageInstances
        await context.createTable('PipelineStageInstances', {
            PipelineStageId: {
                type: DataTypes.INTEGER,
                primaryKey: 'pk',
                allowNull: false,
                references: { model: 'PipelineStages', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            InstanceId: {
                type: DataTypes.UUID,
                primaryKey: 'pk',
                allowNull: false,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })

        // PipelineStageDevices
        await context.createTable('PipelineStageDevices', {
            PipelineStageId: {
                type: DataTypes.INTEGER,
                primaryKey: 'pk',
                allowNull: false,
                references: { model: 'PipelineStages', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            DeviceId: {
                type: DataTypes.INTEGER,
                primaryKey: 'pk',
                allowNull: false,
                references: { model: 'Devices', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })

        // PipelineStageDeviceGroups
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

        // FlowTemplates
        await context.createTable('FlowTemplates', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: { type: DataTypes.STRING, allowNull: false },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            description: { type: DataTypes.TEXT, defaultValue: '' },
            category: { type: DataTypes.STRING, defaultValue: '' },
            order: { type: DataTypes.INTEGER, defaultValue: 0 },
            default: { type: DataTypes.BOOLEAN, defaultValue: false },
            icon: { type: DataTypes.STRING, allowNull: true },
            flows: { type: DataTypes.TEXT },
            modules: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            createdById: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })

        // MFATokens
        await context.createTable('MFATokens', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            token: { type: DataTypes.STRING, allowNull: false },
            verified: { type: DataTypes.BOOLEAN, defaultValue: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            UserId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'Users', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })

        // Organizations
        await context.createTable('Organizations', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            name: { type: DataTypes.STRING, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })
    },
    down: async (context) => {
    }
}
