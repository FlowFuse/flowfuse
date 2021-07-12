import client from './client';

const getUsers = () => {
    return client.get('/api/v1/users').then(res => res.data);
}

export default {
    getUsers
}
