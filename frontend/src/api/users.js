import client from './client';

const getUsers = () => {
    return client.get('/api/v1/users').then(res => res.data);
}

const updateUser = async(userId, options) => {
    return client.put(`/api/v1/users/${userId}`, options).then(res => {
        return res.data
    })
}

export default {
    getUsers,
    updateUser
}
