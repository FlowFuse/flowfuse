<template>
    <div class="forge-block">
        <FormHeading>
            <router-link to="/account/projects">Projects</router-link>
        </FormHeading>
        <div class="text-sm px-4 sm:px-6 lg:px-8 mt-8">
            <ProjectsTable :projects="projects" :projectCount="projectCount" />
        </div>
    </div>
    <div class="forge-block">
        <FormHeading>
            <router-link to="/account/projects">Teams</router-link>
        </FormHeading>
        <div class="text-sm px-4 sm:px-6 lg:px-8 mt-8">
            <TeamsTable :teams="teams" :teamCount="teamCount"  />
        </div>
    </div>
</template>

<script>

import projectApi from '@/api/project'
import teamApi from '@/api/team'

import TeamsTable from '@/components/tables/TeamsTable'
import ProjectsTable from '@/components/tables/ProjectsTable'
import FormHeading from '@/components/FormHeading'

import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'Home',
    mixins: [Breadcrumbs],
    data() {
        return {
            teams: [],
            teamCount: 0,
            projects: [],
            projectCount: 0
        }
    },
    async created() {
        this.clearBreadcrumbs();
        const data = await teamApi.getTeams()
        this.teamCount = data.count;
        this.teams = data.teams;

        const projData = await projectApi.getProjects()
        this.projectCount = projData.count;
        this.projects = projData.projects;
        this.projects.forEach(p => {
            p.teamName = p.team.name;
            p.teamLink = p.team.link;
        })


    },
    components: {
        ProjectsTable,
        TeamsTable,
        FormHeading
    }
}
</script>
