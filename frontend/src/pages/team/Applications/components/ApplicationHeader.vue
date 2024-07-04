<template>
    <div class="ff-application-list--app gap-x-4 flex flex-col gap-2 sm:gap-0 justify-between sm:flex-row sm:items-center" data-action="view-application" @click="openApplication(application)">
        <div class="flex items-cente flex-wrap">
            <span class="ff-application-list--icon flex flex-shrink-0 flex-grow-0 whitespace-nowrap gap-2 w-full"><TemplateIcon class="ff-icon text-gray-600" />{{ application.name }}</span>
            <span class="!inline-block !flex-shrink !flex-grow italic text-gray-500 dark:text-gray-400 truncate"> {{ application.description }} </span>
        </div>
        <ApplicationSummaryLabel :application="application" />
    </div>
</template>

<script>
import { TemplateIcon } from '@heroicons/vue/outline'

import ApplicationSummaryLabel from '../../components/ApplicationSummaryLabel.vue'

export default {
    name: 'ApplicationHeader',
    components: {
        ApplicationSummaryLabel,
        TemplateIcon
    },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    methods: {
        openApplication (application) {
            this.$router.push({
                name: 'Application',
                params: {
                    id: application.id
                }
            })
        }
    }
}
</script>
