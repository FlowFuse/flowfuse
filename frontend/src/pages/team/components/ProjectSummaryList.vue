<template>
    <div class="grid md:grid-cols-2 gap-2">
        <template v-if="applications && applications.length > 0">
            <div class="forge-button-tertiary text-xs" v-for="application in applications" :key="application.id">
                <router-link :to="{name: 'Application', params: {id: application.id}}" data-action="view-application" class="px-1 py-1 flex w-full">
                    <div class="flex-grow">
                        <div class="flex items-center mt-2">
                            <TemplateIcon class="w-6 h-6 mr-4" />
                            <div class="text-base text-gray-800">{{ application.name }}</div>
                        </div>
                        <div class="flex space-x-2 mt-4">
                            <i>To-do: No status or updated at for applications.</i>
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
                <router-link :to="{name: 'CreateTeamApplication'}" class="px-1 py-4 flex w-full">
                    <div class="flex-grow">
                        <div class="text-base flex items-center"><PlusSmIcon class="w-5 h-5 -ml-1 mr-1" /> Create Application</div>
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
import { ChevronRightIcon, PlusSmIcon, TemplateIcon } from '@heroicons/vue/outline'

export default {
    name: 'MemberProjectSummaryList',
    props: ['applications', 'team'],
    components: {
        ChevronRightIcon,
        PlusSmIcon,
        TemplateIcon
    }
}
</script>
