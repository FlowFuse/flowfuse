import client from './client'

// Custom Portal - Redirect
const toCustomerPortal = async (teamId) => {
    window.open('/ee/billing/customer-portal/' + teamId, '_blank')
}

// Add new Subscription (Team)
const createSubscription = async (teamId) => {
    return client.get('/ee/billing/teams' + teamId).then(res => {
        return res.data
    })
}

// Get information on billing/subscription for a given team
const getSubscriptionInfo = async (teamId) => {
    return client.get('/ee/billing/teams/' + teamId).then(res => {
        return res.data
    })
}

// Close a subscription
const closeSubscription = async (teamId) => {
    return client.delete('/ee/billing/teams/' + teamId).then(res => {
        return res.data
    })
}

// Add a new project to a subscription
const addToSubscription = async (teamId, project) => {
    return client.post('/ee/billing/teams/' + teamId + '/projects', project).then(res => {
        return res.data
    })
}

// Remove a project from a subscription
const removeFromSubscription = async (teamId, projectId) => {
    return client.post('/ee/billing/team-update/' + teamId + '/projects/' + projectId).then(res => {
        return res.data
    })
}

export default {
    toCustomerPortal,
    createSubscription,
    getSubscriptionInfo,
    closeSubscription,
    addToSubscription,
    removeFromSubscription
}
