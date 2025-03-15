import client from './client.js'

// Custom Portal - Redirect
const toCustomerPortal = async (teamId) => {
    window.open('/ee/billing/teams/' + teamId + '/customer-portal', '_blank')
}

// Get information on billing/subscription for a given team
const getSubscriptionInfo = async (teamId) => {
    return client.get('/ee/billing/teams/' + teamId).then(res => {
        return res.data
    })
}

// Create a new subscription for a team
const createSubscription = async (teamId, teamTypeId = undefined) => {
    const options = {}
    if (teamTypeId !== undefined) {
        options.teamTypeId = teamTypeId
    }
    return client.post('/ee/billing/teams/' + teamId, options).then(res => {
        return res.data
    })
}

const setupManualBilling = async (teamId, teamTypeId) => {
    return client.post('/ee/billing/teams/' + teamId + '/manual', {
        teamTypeId
    }).then(res => {
        return res.data
    })
}
const disableManualBilling = async (teamId, teamTypeId) => {
    return client.delete('/ee/billing/teams/' + teamId + '/manual').then(res => {
        return res.data
    })
}
const setTrialExpiry = async (teamId, trialEndsAt) => {
    return client.post('/ee/billing/teams/' + teamId + '/trial', {
        trialEndsAt
    }).then(res => {
        return res.data
    })
}

const sendTeamTypeContact = async (user, teamType, pageName) => {
    const hsPortalId = teamType.properties?.billing?.contactHSPortalId
    const hsFormId = teamType.properties?.billing?.contactHSFormId
    if (hsPortalId && hsFormId) {
        return new Promise((resolve, reject) => {
            const url = `https://api.hsforms.com/submissions/v3/integration/submit/${hsPortalId}/${hsFormId}`
            const xhr = new XMLHttpRequest()
            xhr.open('POST', url)
            xhr.setRequestHeader('Content-Type', 'application/json')
            const body = JSON.stringify({
                submittedAt: '' + Date.now(),
                fields: [{
                    objectTypeId: '0-1',
                    name: 'email',
                    value: user.email
                }],
                context: {
                    pageUri: window.location.href,
                    pageName
                }
            })
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    switch (xhr.status) {
                    case 200:
                        resolve()
                        break
                    default:
                        reject(xhr.responseText)
                        break
                    }
                }
            }
            xhr.send(body)
        })
    }
}

export default {
    toCustomerPortal,
    getSubscriptionInfo,
    createSubscription,
    setupManualBilling,
    disableManualBilling,
    setTrialExpiry,
    sendTeamTypeContact
}
