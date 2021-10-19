import client from './client';

const login = (username, password, remember) => {
    return client.post('/account/login',{
        username,
        password,
        remember
    }).then(res => res.data)
}
const logout = () => {
    return client.post('/account/logout').then(res => res.data)
}

const getUser = () => {
    return client.get('/api/v1/user/').then(res => res.data);
}

const changePassword = (old_password, password) => {
    return client.put('/api/v1/user/change_password',{
        old_password,
        password
    }).then(res => res.data)
}

const create = async (options) => {
    return client.post(`/api/v1/user/`, options).then(res => {
        return res.data;
    });
}

const updateUser = async(options) => {
    return client.put(`/api/v1/user`, options).then(res => {
        return res.data
    })
}


export default {
    create,
    getUser,
    login,
    logout,
    changePassword,
    updateUser
}
