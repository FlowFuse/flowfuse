const OWNER_MODELS = {
    project: 'Project',
    device: 'Device'
}

module.exports = {
    tokenOwnerTeamId: async (app, session) => {
        const model = OWNER_MODELS[session.ownerType]
        if (!model) {
            return null
        }
        const owner = await app.db.models[model].findOne({ where: { id: session.ownerId }, attributes: ['TeamId'] })
        return owner?.TeamId ?? null
    }
}
