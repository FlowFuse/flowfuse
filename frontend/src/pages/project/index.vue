<template>
    <div class="forge-block">
        <div class="flex items-center mb-8">
            <div class="text-xl font-bold">{{ project.name }}</div>
            <div class="ml-8 flex-grow flex items-center">
                <a :href="project.url" target="_blank" class="forge-button-tertiary">
                    <ExternalLinkIcon class="w-4 my-1 mr-1" /><span class="ml-1">Open Editor</span>
                </a>
                <button type="button" title="Copy url" class="forge-button-tertiary ml-1"><span class="sr-only">Copy url</span><ClipboardCopyIcon class="w-4 my-1" /></button>
            </div>
            <DropdownMenu class="ml-8" alt="Open options menu" :options="options">Options</DropdownMenu>
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
import DropdownMenu from '@/components/DropdownMenu'
import { ExternalLinkIcon, ClipboardCopyIcon } from '@heroicons/vue/outline'
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
    computed: {
        options: function() {
            return [
                {name: "Start", action: function() { console.log("start")}},
                {name: "Restart", action: function() { console.log("start")}},
                {name: "Stop"}
            ]
        }
    },
    components: {
        FormHeading,
        ExternalLinkIcon,
        ClipboardCopyIcon,
        DropdownMenu
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
            { name: "Settings", path: `/project/${parts[2]}/settings` },
            { name: "Debug", path: `/project/${parts[2]}/debug` },
        ]
        this.setBreadcrumbs([
            { type: 'TeamPicker'},
            {label: this.project.name, to: { name: "Project", params: {id:this.project.id}}}
        ])


    }
}
</script>
