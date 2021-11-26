import client from './client';
import daysSince from '@/utils/daysSince';
import elapsedTime from '@/utils/elapsedTime';

const getStats = async (options) => {
    return client.get(`/api/v1/admin/stats`, options).then(res => {
        return res.data;
    });
}


const getInvitations= async (options) => {
    return client.get(`/api/v1/admin/invitations`, options).then(res => {
        res.data.invitations = res.data.invitations.map(r => {
            r.createdSince = daysSince(r.createdAt)
            r.expires = elapsedTime((new Date(r.expiresAt)).getTime() - Date.now())
            return r;
        });
        return res.data;
    });
}
export default {
    getStats,
    getInvitations
}
