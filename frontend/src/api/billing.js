import client from './client'

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

export default {
    toCustomerPortal,
    getSubscriptionInfo
}
