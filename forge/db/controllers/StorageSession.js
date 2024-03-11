module.exports = {
    async removeUserFromSessions (app, user) {
        const sessions = await app.db.models.StorageSession.byUsername(user.username)
        for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
            const session = sessions[sessionIndex]
            const instanceId = session.ProjectId
            const sessionInfo = JSON.parse(session.sessions)
            let modified = false
            const userSessions = Object.values(sessionInfo).filter(session => {
                if (session.user === user.username) {
                    delete sessionInfo[session.accessToken]
                    modified = true
                    return true
                }
                return false
            })
            if (modified) {
                // Save back the session table without this user's sessions included
                // This ensures any suspended instances have their session table updated
                session.sessions = JSON.stringify(sessionInfo)
                await session.save()
            }
            if (userSessions.length > 0) {
                const instance = await app.db.models.Project.byId(instanceId)
                for (let i = 0; i < userSessions.length; i++) {
                    const token = userSessions[i].accessToken
                    try {
                        await app.containers.revokeUserToken(instance, token) // logout:nodered(step-2)
                    } catch (error) {
                        app.log.warn(`Failed to revoke token for Instance ${instanceId}: ${error.toString()}`) // log error but continue to delete session
                    }
                }
            }
        }
    },
    async removeAllUsersFromInstance (app, instance) {
        const sessions = await app.db.models.StorageSession.byProject(instance.id)
        if (sessions) {
            const sessionInfo = JSON.parse(sessions.sessions)
            const userSessions = Object.values(sessionInfo)
            // remove all sessions for this Instance
            for (let i = 0; i < userSessions.length; i++) {
                const token = userSessions[i].accessToken
                try {
                    await app.containers.revokeUserToken(instance, token)
                } catch (error) {
                    app.log.warn(`Failed to revoke token for Instance ${instance.id}: ${error.toString()}`) // log error but continue to delete session
                }
            }
            sessions.session = '{}'
            await sessions.save()
        }
    }
}
