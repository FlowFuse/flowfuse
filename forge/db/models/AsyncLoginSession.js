const { DataTypes } = require('sequelize')

const { generateToken } = require('../utils')

async function validateSessionExpiry (session) {
    if (session) {
        const age = Date.now() - session.createdAt.getTime()
        if (age > 1000 * 60 * 30) {
            // session is older than 30 minutes, expire it
            await session.destroy()
            return null
        }
    }
    return session
}

module.exports = {
    name: 'AsyncLoginSession',
    schema: {
        sessionToken: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        doneToken: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'pending'
        },
        result: {
            type: DataTypes.STRING
        }
    },
    finders: function (M) {
        return {
            static: {
                createToken: async () => {
                    const sessionToken = generateToken(32)
                    const doneToken = generateToken(32)
                    const session = await this.create({
                        sessionToken,
                        doneToken
                    })
                    return session
                },
                bySessionToken: async (sessionToken) => {
                    const session = await this.findOne({
                        where: { sessionToken }
                    })
                    return validateSessionExpiry(session)
                },
                getAndExpireByDoneToken: async (doneToken) => {
                    let session = await this.findOne({
                        where: { doneToken }
                    })
                    session = await validateSessionExpiry(session)
                    if (session && session.status !== 'pending') {
                        // The session is resolved. We only allow retrieving it once,
                        // so we destroy it after retrieval.
                        await session.destroy()
                    }
                    return session
                }
            }
        }
    }
}
