import client from './client.js'

const getFiles = function (instanceId, path) {
    return client.get(`/api/v1/projects/${instanceId}/files/_/${path || ''}`).then(res => {
        return res.data.files
    })
}

const createFolder = function (instanceId, path, folderName) {
    return client.post(`/api/v1/projects/${instanceId}/files/_/${path || ''}`, {
        path: folderName
    }, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
}

export default {
    getFiles,
    createFolder
}
