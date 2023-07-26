const crypto = require('crypto')

const { encryptCreds } = require('./credentials')

module.exports.addFlowsToProject = async function (app, id, token, userToken, flows, creds, key, settings) {
    const flowsAddResponse = await app.inject({
        method: 'POST',
        url: `/storage/${id}/flows`,
        payload: flows,
        headers: {
            authorization: `Bearer ${token}`
        }
    })
    const hashKey = crypto.createHash('sha256').update(key).digest()
    const credentialsCreateResponse = await app.inject({
        method: 'POST',
        url: `/storage/${id}/credentials`,
        payload: encryptCreds(hashKey, creds),
        headers: {
            authorization: `Bearer ${token}`
        }
    })
    const storageSettingsResponse = await app.inject({
        method: 'POST',
        url: `/storage/${id}/settings`,
        payload: { _credentialSecret: key },
        headers: {
            authorization: `Bearer ${token}`
        }
    })
    const updateProjectSettingsResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${id}`,
        payload: {
            settings
        },
        cookies: { sid: userToken }
    })
    return {
        flowsAddResponse,
        credentialsCreateResponse,
        storageSettingsResponse,
        updateProjectSettingsResponse
    }
}
