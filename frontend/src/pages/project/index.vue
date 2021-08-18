<template>
    <div class="forge-block">
        <div class="flex items-center mb-8">
            <div class="mr-3"><img :src="project.avatar" class="h-14 v-14 rounded-md"/></div>
            <div class="flex flex-col">
                <div class="text-xl font-bold">{{ project.name }}</div>
            </div>
        </div>
        <ul class="flex border-b border-gray-700 mb-10 text-gray-500">
            <template v-for="(item, itemIdx) in navigation" :key="project.name">
                <li class="mr-8 flex">
                    <router-link :to="item.path" class="text-sm sm:pb-3 pb-1" active-class="text-blue-700 border-b-4 border-blue-700">{{ item.name }}</router-link>
                </li>
            </template>
        </ul>

        <div class="text-sm px-4 sm:px-6 lg:px-8 mt-8">
            <router-view :project="project"></router-view>
        </div>
    </div>
</template>

<script>
import projectApi from '@/api/project'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'Project',
    mixins: [Breadcrumbs],
    data: function() {
        return {
            project: {},
            navigation: []
        }
    },
    components: {
        FormHeading,
    },
    async created() {
        this.setBreadcrumbs([
            { label: '', value: ':team' },
            { label: '', value: ':project' },
            { label: ''  }
        ]);
        const parts = this.$route.path.split("/")
        const data = await projectApi.getProject(parts[2])
        this.project = data;

        this.replaceBreadcrumb({
            ':project': { label: this.project.name },
            ':team': { label: this.project.team.name, to: {path: '/team/'+this.project.team.slug} }
        });



        this.navigation = [
            { name: "Overview", path: `/projects/${parts[2]}/overview` },
            { name: "Settings", path: `/projects/${parts[2]}/settings` },
        ]
    }
}
</script>
