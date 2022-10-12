<template>
    <div v-if="project.meta" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="border rounded p-4">
                <FormHeading><TemplateIcon class="w-6 h-6 mr-2 inline text-gray-400" />Overview</FormHeading>

                <table class="table-fixed w-full">
                    <tr class="border-b">
                        <td class="w-1/4 font-medium">Editor</td>
                        <td>
                            <div v-if="editorAvailable">
                                <div v-if="isVisitingAdmin" class="my-2">
                                    {{project.url}}
                                </div>
                                <a v-else :href="project.url" target="_blank" class="forge-button-secondary py-1 mb-1" data-el="editor-link">
                                    <span class="ml-r">{{project.url}}</span>
                                    <ExternalLinkIcon class="w-4 ml-3" />
                                </a>
                            </div>
                            <div v-else class="my-2">Unavailable</div>
                        </td>
                    </tr>
                    <tr class="border-b">
                        <td class="font-medium">Status</td>
                        <td><div class="py-2"><ProjectStatusBadge :status="project.meta.state" :pendingStateChange="project.pendingStateChange" /></div></td>
                    </tr>
                    <tr class="border-b">
                        <td class="font-medium">Type</td>
                        <td class="flex items-center">
                            <div class="py-2 flex-grow">{{project.projectType?.name || 'none'}} / {{project.stack?.name || 'none'}}</div>
                            <div v-if="project.stack.replacedBy">
                                <ff-button size="small" to="./settings/danger">Update</ff-button>
                            </div>
                        </td>
                    </tr>
                    <template v-if="project.meta.versions">
                        <tr class="border-b">
                            <td class="font-medium">Node-RED Version</td>
                            <td><div class="py-2">{{project.meta.versions['node-red']}}</div></td>
                        </tr>
                        <tr class="border-b">
                            <td class="font-medium">Launcher Version</td>
                            <td><div class="py-2">{{project.meta.versions.launcher}}</div></td>
                        </tr>
                        <tr class="border-b">
                            <td class="font-medium">Node.js Version</td>
                            <td><div class="py-2">{{project.meta.versions.node}}</div></td>
                        </tr>
                    </template>
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
    props: ['project', 'isVisitingAdmin'],
    computed: {
        options: function () {
            return [
                { name: 'Start', action: async () => { await projectApi.startProject(this.project.id) } },
                { name: 'Restart', action: async () => { await projectApi.restartProject(this.project.id) } },
                { name: 'Suspend', action: () => { this.$router.push({ path: `/project/${this.project.id}/settings/danger` }) } }
            ]
        },
        editorAvailable: function () {
            return this.project.meta && this.project.meta.state === 'running'
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
