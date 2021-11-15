<template>
    <div class="forge-block">
        <SectionTopMenu :options="navigation">
            <template v-slot:hero>
                <router-link :to="navigation[0]?navigation[0].path:''" class="flex items-center">
                    <div class="text-gray-800 text-xl font-bold">{{ project.name }}</div>
                </router-link>
            </template>
        </SectionTopMenu>
        <div class="text-sm sm:px-6 mt-4 sm:mt-8">
            <router-view :project="project"></router-view>
        </div>
    </div>
</template>

<script>
import projectApi from '@/api/project'
import Breadcrumbs from '@/mixins/Breadcrumbs';
import SectionTopMenu from '@/components/SectionTopMenu';

export default {
    name: 'Project',
    mixins: [Breadcrumbs],
    data: function() {
        return {
            project: {},
            navigation: []
        }
    },
    async created() {
        const parts = this.$route.path.split("/")
        try {
            const data = await projectApi.getProject(parts[2])
            this.project = data;
            this.$store.dispatch('account/setTeam',this.project.team.slug);
        } catch(err) {
            this.$router.push({
                name: "PageNotFound",
                params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                // preserve existing query and hash if any
                query: this.$router.currentRoute.value.query,
                hash: this.$router.currentRoute.value.hash,
            })
            return;
        }

        this.navigation = [
            { name: "Overview", path: `/project/${parts[2]}/overview` },
            { name: "Deploys", path: `/project/${parts[2]}/deploys` },
            { name: "Audit Log", path: `/project/${parts[2]}/audit-log` },
            { name: "Settings", path: `/project/${parts[2]}/settings` },
            { name: "Debug", path: `/project/${parts[2]}/debug` },
        ]
        this.setBreadcrumbs([
            { type: 'TeamLink'},
            {label: this.project.name /*, to: { name: "Project", params: {id:this.project.id}} */}
        ])
    },
    components: {
        SectionTopMenu
    }
}
</script>
