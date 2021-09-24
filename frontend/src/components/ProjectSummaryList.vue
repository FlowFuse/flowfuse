<template>
    <div class="grid grid-cols-2 gap-2">
        <template v-if="projects && projects.length > 0">
            <div class="forge-button-tertiary text-xs" v-for="project in projects">
                <router-link :to="`/project/${project.id}`" class="px-1 py-4 flex w-full">
                    <div class="flex-grow">
                        <div class="text-base text-gray-800">{{project.name}}</div>
                        <div v-if="showTeam" class="pt-3 text-xs text-gray-400">{{project.team.name}}</div>
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

import CreateProjectButton from "@/components/CreateProjectButton"
import { PlusSmIcon, ChevronRightIcon, ExternalLinkIcon } from '@heroicons/vue/outline'

export default {
    name: 'MemberProjectSummaryList',
    props:[ "projects", "team", "showTeam"],
    components: {
        ExternalLinkIcon,
        ChevronRightIcon,
        CreateProjectButton,
        PlusSmIcon
    }
}
</script>
