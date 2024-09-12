import client from './client.js'

const getNpmDependency = async (dependency) => {
    return client.get(`https://registry.npmjs.com/${dependency}`)
        .then(res => {
            return res.data
        })
}

export default {
    getNpmDependency
}
