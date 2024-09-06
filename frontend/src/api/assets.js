import client from './client.js'

const getFiles = function (instanceId, path) {
    // remove leading / from path
    path = path.replace(/^\//, '')
    return client.get(`/api/v1/projects/${instanceId}/files/_/${encodeURIComponent(path || '')}`).then(res => {
        return res.data.files
    })
}

const createFolder = function (instanceId, path, folderName) {
    // remove leading / from path
    path = path.replace(/^\//, '')
    return client.post(`/api/v1/projects/${instanceId}/files/_/${encodeURIComponent(path || '')}`, {
        path: folderName
    }, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
}

const updateFolder = function (instanceId, pwd, oldName, newName) {
    // remove leading / from path
    pwd = pwd.replace(/^\//, '')
    const oldAbsPath = pwd + '/' + oldName
    const newAbsPath = pwd + '/' + newName
    return client.put(`/api/v1/projects/${instanceId}/files/_/${encodeURIComponent(oldAbsPath || '')}`, {
        path: newAbsPath
    })
}

const updateVisibility = function (instanceId, pwd, visibility, staticPath = '') {
    // remove leading / from path
    pwd = pwd.replace(/^\//, '')
    return client.put(`/api/v1/projects/${instanceId}/files/_/${encodeURIComponent(pwd)}`, {
        share: visibility === 'public' ? { root: staticPath } : {}
    })
}

const deleteItem = function (instanceId, path) {
    // remove leading / from path
    path = path.replace(/^\//, '')
    return client.delete(`/api/v1/projects/${instanceId}/files/_/${encodeURIComponent(path || '')}`)
}

const uploadFile = function (instanceId, path, filename, file) {
    // remove leading / from path
    path = [path, filename].join('/').replace(/^\//, '')
    const formData = new FormData()
    formData.append('file', file)
    return client.post(`/api/v1/projects/${instanceId}/files/_/${encodeURIComponent(path || '')}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

export default {
    getFiles,
    createFolder,
    updateFolder,
    updateVisibility,
    deleteItem,
    uploadFile
}
