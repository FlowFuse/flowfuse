import client from './client';

const create = async (options) => {
    return client.post(`/api/v1/users`, options).then(res => {
        return res.data;
    });
}

const getUsers = () => {
    return client.get('/api/v1/users').then(res => res.data);
}

const updateUser = async(userId, options) => {
    return client.put(`/api/v1/users/${userId}`, options).then(res => {
        return res.data
    })
}

export default {
    create,
    getUsers,
    updateUser
}
