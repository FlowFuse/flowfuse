<template>
    <div class="grid md:grid-cols-2 gap-2">
        <template v-if="projects && projects.length > 0">
            <div class="forge-button-tertiary text-xs" v-for="project in projects" :key="project.id">
                <router-link :to="{name: 'Project', params: {id: project.id}}" data-action="view-project" class="px-1 py-1 flex w-full">
                    <div class="flex-grow">
                        <div class="flex items-center mt-2">
                            <TemplateIcon class="w-6 h-6 mr-4" />
                            <div class="text-base text-gray-800">{{project.name}}</div>
                        </div>
                        <div class="flex space-x-2 mt-4">
                            <ProjectStatusBadge :status="project.status" />
                            <div class="forge-badge">Updated: {{project.updatedSince}}</div>
                        </div>
                    </div>
                    <div class="flex">
                        <ChevronRightIcon class="w-3" />
                    </div>
                </router-link>
            </div>
        </template>
        <template v-else>
            <div class="forge-button-tertiary text-xs border-dashed">
                <router-link :to="team?`/team/${team.slug}/projects/create`:'/create'" class="px-1 py-4 flex w-full">
                    <div class="flex-grow">
                        <div class="text-base flex items-center"><PlusSmIcon class="w-5 h-5 -ml-1 mr-1" /> Create Project</div>
                    </div>
                    <div class="flex">
                        <ChevronRightIcon class="w-3" />
                    </div>
                </router-link>
            </div>
        </template>
    </div>
</template>

<script>
import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'
import { PlusSmIcon, ChevronRightIcon, TemplateIcon } from '@heroicons/vue/outline'

export default {
    name: 'MemberProjectSummaryList',
    props: ['projects', 'team'],
    components: {
        ProjectStatusBadge,
        ChevronRightIcon,
        PlusSmIcon,
        TemplateIcon
    }
}
</script>
