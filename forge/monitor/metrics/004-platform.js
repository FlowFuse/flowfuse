module.exports = async (app) => {
    let sharedLibraryEntries = 0
    if (app.license.active()) {
        sharedLibraryEntries = await app.db.models.StorageSharedLibrary?.count()
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
    return {
        'platform.counts.users': await app.db.models.User.count(),
        'platform.counts.teams': await app.db.models.Team.count(),
        'platform.counts.projects': await app.db.models.Project.count(),
        'platform.counts.devices': await app.db.models.Device.count(),
        'platform.counts.projectSnapshots': await app.db.models.ProjectSnapshot.count(),
        'platform.counts.projectTemplates': await app.db.models.ProjectStack.count(),
        'platform.counts.projectStacks': await app.db.models.ProjectTemplate.count(),
        'platform.counts.libraryEntries': await app.db.models.StorageLibrary.count(),
        'platform.counts.sharedLibraryEntries': sharedLibraryEntries,

        'platform.config.driver': app.config.driver.type,
        'platform.config.broker.enabled': !!app.config.broker,
        'platform.config.fileStore.enabled': !!app.config.fileStore,
        'platform.config.email.enabled': app.postoffice.enabled(),

        'platform.license.id': app.license.get('id') || '',
        'platform.license.type': licenseType()
    }
}
