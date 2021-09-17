const { DataTypes } = require('sequelize');

module.exports = {
    up: async (context) => {
        await context.createTable('MetaVersion', {
            id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                primaryKey: true,
                autoIncrement: true
            },
            version: {
                type: DataTypes.STRING,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                primaryKey: false,
                unique: false
            }
        })


        await context.createTable('AuthClients', {
            clientID: {
                type: DataTypes.STRING,
                primaryKey: true,
            },
            clientSecret: {
                type: DataTypes.STRING,
                allowNull: true,
                primaryKey: false,
                unique: false
            },
            ownerId: {
                type: DataTypes.STRING,
                allowNull: true,
                primaryKey: false,
                unique: false
            },
            ownerType: {
                type: DataTypes.STRING,
                allowNull: true,
                primaryKey: false,
                unique: false
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                primaryKey: false,
                unique: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                primaryKey: false,
                unique: false
            }
        })
        await context.createTable('Organizations', {
            id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        });

        await context.createTable('Projects', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            type: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            url: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            TeamId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                unique: false,
                references: { model: 'Teams', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            }
        })

        await context.createTable('Sessions',{
            sid: {
                type: DataTypes.STRING,
                allowNull: false,
                primaryKey: true,
            },
            expiresAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            refreshToken: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            UserId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                unique: false,
                references: { model: 'Users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            }
        });


        await context.createTable('TeamMembers', {
            role: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            UserId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: { model: 'Users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            TeamId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: { model: 'Teams', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            }
        });

        await context.createTable('Teams', {
            id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            slug: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            avatar: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        });

        await context.createTable('Users', {
            id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            password: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            admin: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            avatar: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        });
    },
    down: async (context) => {
        await context.dropTable('AuthClients');
        await context.dropTable('Organizations');
        await context.dropTable('Projects');
        await context.dropTable('Sessions');
        await context.dropTable('TeamMembers');
        await context.dropTable('Teams');
        await context.dropTable('User');
    },
    versions: {
        AuthClients: 'kTr7ULRrjwyYDlpN0xVNQeiqiGxABXfX/vZjN/Q5HdA=',
        Organizations: 'UFO0WcKuBCyS3o/UGJtfW5prUjhjMC+1zcaUhfN7KbU=',
        Projects: 'SfM+Sz8UglVKE2s3d77+xTjZA3ZzzV2Wm33cnWajTrY=',
        Sessions: 'TzJ+NCbsz5c4Li97QnXVe7oT+FZwM6ElfQQ/3K4WsEE=',
        TeamMembers: 'zu72s0leAhMHSfV7F6wTqiqz4ZM5RvNMvQnuduT1XUM=',
        Teams: '+ySn+3xHMXzqSQnldQPnkHn98LT76Ex1oTQ5og4Da+w=',
        Users: 'zbdvpkj1PYSC+n8F5l10IHZleymAlIBWHT4E49lYbso=',
        MetaVersion: 'YA2/56YYJEIwcuvnh6d4TIoKfaNxDqqreId6KkdvmFM='
    }
}
