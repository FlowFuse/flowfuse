import client from './client.js'

const getFiles = function (instanceId, path) {
    // remove leading / from path
    path = path.replace(/^\//, '')
    return client.get(`/api/v1/projects/${instanceId}/files/_/${path || ''}`).then(res => {
        return res.data.files
    })
}

const createFolder = function (instanceId, path, folderName) {
    // remove leading / from path
    path = path.replace(/^\//, '')
    return client.post(`/api/v1/projects/${instanceId}/files/_/${path || ''}`, {
        path: folderName
    }, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
}

const updateFolder = function (instanceId, path, folderName) {
    // remove leading / from path
    path = path.replace(/^\//, '')
    return client.put(`/api/v1/projects/${instanceId}/files/_/${path || ''}`, {
        path: folderName
    })
}

const deleteItem = function (instanceId, path) {
    // remove leading / from path
    path = path.replace(/^\//, '')
    return client.delete(`/api/v1/projects/${instanceId}/files/_/${path || ''}`)
}

export default {
    getFiles,
    createFolder,
    updateFolder,
    deleteItem
}
