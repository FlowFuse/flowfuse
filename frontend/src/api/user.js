import client from './client';

const login = (username, password, remember) => {
    return client.post('/account/login',{
        username,
        password,
        remember
    })
}
const logout = () => {
    return client.post('/account/logout')
}

const getUser = () => {
    return client.get('/api/v1/user/');
}

const changePassword = (old_password, password) => {
    return client.post('/api/v1/user/change_password',{
        old_password,
        password
    })
}
export default {
    getUser,
    login,
    logout,
    changePassword
}
