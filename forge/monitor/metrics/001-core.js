module.exports = (app) => {
    return {
        instanceId: app.settings.get('instanceId')
    }
}
