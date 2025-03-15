const { Op } = require('sequelize')

module.exports = async (app) => {
    let sharedLibraryEntries = 0
    let blueprintCount = 0
    let teamBrokerClients = 0
    let remoteBrokers = 0
    if (app.license.active()) {
        blueprintCount = await app.db.models.FlowTemplate?.count()
        sharedLibraryEntries = await app.db.models.StorageSharedLibrary?.count()
        teamBrokerClients = await app.db.models.TeamBrokerClient?.count()
        remoteBrokers = await app.db.models.BrokerCredentials?.count()
    }
    const licenseType = () => {
        if (app.license.active()) {
            if (app.license.get('dev') === true) {
                return 'DEV'
            }
            return 'EE'
        }
        return 'CE'
    }

    const projectStateCounts = await app.db.models.Project.count({ attributes: ['state'], group: 'state' })
    const projectStates = {}
    projectStateCounts.forEach(state => { projectStates[state.state] = state.count })

    const now = Date.now()
    const devicesByLastSeenNever = await app.db.models.Device.count({ where: { lastSeenAt: null } })
    const devicesByLastSeenDay = await app.db.models.Device.count({ where: { lastSeenAt: { [Op.gte]: new Date(now - 1000 * 60 * 60 * 24) } } })

    return {
        'platform.counts.users': await app.db.models.User.count(),
        'platform.counts.teams': await app.db.models.Team.count(),
        'platform.counts.projects': await app.db.models.Project.count(),
        'platform.counts.projectsByState.suspended': projectStates.suspended || 0,
        'platform.counts.devices': await app.db.models.Device.count(),
        'platform.counts.devicesByLastSeen.never': devicesByLastSeenNever,
        'platform.counts.devicesByLastSeen.day': devicesByLastSeenDay,
        'platform.counts.projectSnapshots': await app.db.models.ProjectSnapshot.count(),
        'platform.counts.projectTemplates': await app.db.models.ProjectStack.count(),
        'platform.counts.projectStacks': await app.db.models.ProjectTemplate.count(),
        'platform.counts.libraryEntries': await app.db.models.StorageLibrary.count(),
        'platform.counts.blueprints': blueprintCount,
        'platform.counts.sharedLibraryEntries': sharedLibraryEntries,
        'platform.counts.teamBrokerClients': teamBrokerClients,
        'platform.counts.remoteBrokers': remoteBrokers,
        'platform.config.driver': app.config.driver.type,
        'platform.config.broker.enabled': !!app.config.broker,
        'platform.config.fileStore.enabled': !!app.config.fileStore,
        'platform.config.email.enabled': app.postoffice.enabled(),

        'platform.license.id': app.license.get('id') || '',
        'platform.license.type': licenseType()
    }
}
