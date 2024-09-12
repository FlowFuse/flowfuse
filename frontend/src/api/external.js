import client from './client.js'

const getNpmDependency = async (dependency, version = '') => {
    return client.get(`https://registry.npmjs.com/${dependency}/${version}`)
        .then(res => {
            return res.data
        })
}

export default {
    getNpmDependency
}
