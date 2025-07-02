import client from './client.js'

const searchInstances = (team, query) => {
    const queryString = new URLSearchParams({
        team,
        query
    }).toString()

    return client.get(`/api/v1/search/instances?${queryString}`)
        .then(res => res.data)
        .catch(e => e)
}

export default {
    searchInstances
}
