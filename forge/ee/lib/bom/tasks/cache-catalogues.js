const axios = require('axios')

const { decodeCertifiedNodesToken } = require('../../../../lib/npm')

const NODE_VERSION_CACHE = 'nodes-latestVersion'

module.exports = {
    name: 'cacheCatalogues',
    startup: 1000 * 90, // 90 seconds after start up to ensure cache populated
    schedule: '47 21 * * *', // Update at 21:47 every day (if not done with a restart)
    run: async function (app) {
        app.caches.createCache(NODE_VERSION_CACHE)
        const cache = app.caches.getCache(NODE_VERSION_CACHE)
        // Starting list of catalogues
        const cataloguesList = [
            'https://catalogue.nodered.org/catalogue.json'
        ]

        const platformNPMEnabled = !!app.config.features.enabled('certifiedNodes', false) &&
                                   !!app.config.features.enabled('ffNodes', false) &&
                                   !!app.settings.get('platform:ff-npm-registry:token')
        if (platformNPMEnabled) {
            // gets platform wide certified nodes catalogues but not per team override
            const { catalogues } = decodeCertifiedNodesToken(app.settings.get('platform:ff-npm-registry:token'), 'placeholder')
            cataloguesList.push(...catalogues)
        }

        for (const cat of cataloguesList) {
            app.log.debug(`Checking catalogue ${cat} for latest node versions`)
            try {
                const res = await axios.get(cat, {
                    headers: {
                        Accept: 'application/json'
                    }
                })
                if (res.status === 200) {
                    const modules = res.data.modules
                    for (const mod of modules) {
                        const name = mod.id
                        const version = mod.version
                        const current = await cache.get(name)
                        if (current && current !== version) {
                            await app.models.NodeREDNodeVersions.updateAllLatest(name, version)
                        }
                        cache.set(name, version)
                    }
                }
            } catch (err) {
                app.log.debug(`Problem reading catalogue ${cat}, ${err.toString()}`)
            }
        }
    }
}
