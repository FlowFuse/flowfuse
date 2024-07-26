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

const setTrialExpiry = async (teamId, trialEndsAt) => {
    return client.post('/ee/billing/teams/' + teamId + '/trial', {
        trialEndsAt
    }).then(res => {
        return res.data
    })
}

export default {
    toCustomerPortal,
    getSubscriptionInfo,
    createSubscription,
    setupManualBilling,
    setTrialExpiry
}
