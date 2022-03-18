<template>
    <div v-if="project.meta" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="border rounded p-4">
                <FormHeading><TemplateIcon class="w-6 h-6 mr-2 inline text-gray-400" />Overview</FormHeading>

                <table class="table-fixed w-full">
                    <tr class="border-b">
                        <td class="w-1/4">Editor</td>
                        <td><a :href="project.url" target="_blank" class="forge-button-inline py-2 -mx-3"><span class="ml-r">{{project.url}}</span><ExternalLinkIcon class="w-4 ml-3" /></a></td>
                    </tr>
                    <tr class="border-b">
                        <td class="">Status</td>
                        <td><div class="py-2"><ProjectStatusBadge :status="project.meta.state" :pendingStateChange="project.pendingStateChange" /></div></td>
                    </tr>
                </table>
            </div>
            <div class="border rounded p-4">
                <FormHeading><TrendingUpIcon class="w-6 h-6 mr-2 inline text-gray-400" />Recent Activity</FormHeading>
                <AuditLog :entity="project" :loadItems="loadItems" :showLoadMore="false" />
                <div class="py-4">
                    <router-link to="./activity" class="forge-button-inline">More...</router-link>
                </div>
            </div>
        </div>
    </div>

</template>

<script>
import projectApi from '@/api/project'
import { ExternalLinkIcon, TrendingUpIcon, TemplateIcon } from '@heroicons/vue/outline'
import FormHeading from '@/components/FormHeading'
import ProjectStatusBadge from './components/ProjectStatusBadge'
import AuditLog from '@/components/AuditLog'

export default {
    name: 'ProjectOverview',
    props: ['project'],
    computed: {
        options: function () {
            return [
                { name: 'Start', action: async () => { await projectApi.startProject(this.project.id) } },
                { name: 'Restart', action: async () => { await projectApi.restartProject(this.project.id) } },
                { name: 'Stop', action: async () => { await projectApi.stopProject(this.project.id) } }
            ]
        }
    },
    methods: {
        loadItems: async function (projectId, cursor) {
            return await projectApi.getProjectAuditLog(projectId, cursor, 4)
        }
    },
    components: {
        ProjectStatusBadge,
        FormHeading,
        AuditLog,
        ExternalLinkIcon,
        TemplateIcon,
        TrendingUpIcon
    }
}
</script>
