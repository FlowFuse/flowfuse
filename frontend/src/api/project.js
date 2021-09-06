import client from './client';
import slugify from '@/utils/slugify';
import daysSince from '@/utils/daysSince';


const getProject = (project) => {
    const slug = slugify(project);
    return client.get(`/api/v1/project/${slug}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data;
    });
}

const getProjects = () => {
    return client.get('/api/v1/user/projects').then(res => {
        res.data.projects = res.data.projects.map(r => {
            r.createdSince = daysSince(r.createdAt)
            r.updatedSince = daysSince(r.updatedAt)
            r.link = { name: 'Project', params: { id: r.id }}
            r.team.link = { name: 'Team', params: { id: slugify(r.team.name) }}
            return r;
        })
        return res.data;
    });
}

export default {
    getProject,
    getProjects
}
