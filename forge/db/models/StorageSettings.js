/**
 * A Project's Settings
 * @namespace forge.db.models.StorageSettings
 */
const { DataTypes } = require('sequelize')

const NODE_VERSION_CACHE = 'nodes-latestVersion'

module.exports = {
    name: 'StorageSettings',
    schema: {
        settings: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' }
    },
    associations: function (M) {
        this.belongsTo(M.Project)
    },
    finders: function (M) {
        return {
            static: {
                byProject: async (project) => {
                    return this.findOne({
                        where: { ProjectId: project },
                        attributes: ['id', 'settings']
                    })
                }
            }
        }
    },
    hooks: function (M, app) {
        return {
            afterUpdate: async (storageSettings, options) => {
                try {
                    const cache = app.caches.getCache(NODE_VERSION_CACHE)
                    await storageSettings.reload({
                        attributes: ['id', 'settings', 'ProjectId']
                    })
                    const settingsObj = JSON.parse(storageSettings.settings)
                    const nodes = settingsObj.nodes
                    for (const n of Object.keys(nodes)) {
                        if (n !== 'node-red') {
                            const latest = await cache.get(n)
                            await app.db.models.NodeREDNodeVersions.upsert({
                                ownerId: storageSettings.ProjectId,
                                ownerType: 'instance',
                                name: n,
                                currentVersion: nodes[n].version,
                                latestVersion: latest
                            })
                        }
                    }
                } catch (err) {
                    // console.log(err)
                }
            }
        }
    }
}
