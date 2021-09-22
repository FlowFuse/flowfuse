<template>
    <div class="text-right mb-4"><CreateProjectButton /></div>
    <ProjectsTable :projects="projects" :projectCount="projectCount"/>
</template>

<script>

import projectApi from '@/api/project'
import ProjectsTable from '@/components/tables/ProjectsTable'
import Breadcrumbs from '@/mixins/Breadcrumbs';
import CreateProjectButton from '@/components/CreateProjectButton'

export default {
    name: 'AccountProjects',
    mixins: [Breadcrumbs],
    data() {
        return {
            projects: [],
            projectCount: 0
        }
    },
    async created() {
        this.replaceLastBreadcrumb({ label:"Projects" })
        const data = await projectApi.getProjects()
        this.projectCount = data.count;
        this.projects = data.projects;
        this.projects.forEach(p => {
            p.teamName = p.team.name;
            p.teamLink = p.team.link;
        })
    },
    components: {
        ProjectsTable,
        CreateProjectButton
    }
}
</script>
