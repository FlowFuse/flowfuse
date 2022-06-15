<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="border rounded p-4">
            <FormHeading>
                <WifiIcon class="w-6 h-6 mr-2 inline text-gray-400" />
                Connection
            </FormHeading>

            <table class="table-fixed w-full" v-if="device">
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Status</td>
                    <td class="py-2">
                        <ProjectStatusBadge :status="device.status"/>
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Last Seen</td>
                    <td class="py-2">{{ device.lastSeenAt || "Not Available" }}</td>
                </tr>
            </table>
        </div>
        <div class="border rounded p-4">
            <FormHeading>
                <TemplateIcon class="w-6 h-6 mr-2 inline text-gray-400" />
                Deployment
            </FormHeading>

            <table class="table-fixed w-full" v-if="device">
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Project</td>
                    <td class="py-2">
                        <router-link v-if="device?.project" :to="{name: 'Project', params: { id: device.project.id }}">
                            {{ device.project?.name }}
                        </router-link>
                        <span v-else>No Project Assigned</span>
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Active Snapshot</td>
                    <td class="py-2 flex">
                        <span class="flex space-x-4 pr-2">
                            <span v-if="updateNeeded" class="flex items-center space-x-2 text-gray-500 italic">
                                <ExclamationIcon class="text-yellow-600 w-4" v-if="updateNeeded" />
                                <CheckCircleIcon class="text-green-700 w-4" v-else />
                            </span>
                        </span>
                        {{ device.activeSnapshot || "No Snapshot Deployed" }}
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Target Snapshot</td>
                    <td class="py-2 flex">
                        <span class="flex space-x-4 pr-2">
                            <span v-if="updateNeeded" class="flex items-center space-x-2 text-gray-500 italic">
                                <ExclamationIcon class="text-yellow-600 w-4" v-if="!device.targetSnapshot" />
                                <CheckCircleIcon class="text-green-700 w-4" v-else />
                            </span>
                        </span>
                        {{ device.targetSnapshot || "No Target Snapshot Set" }}
                    </td>
                </tr>
            </table>
        </div>
    </div>
</template>

<script>

import FormHeading from '@/components/FormHeading'
import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'

import { CheckCircleIcon, ExclamationIcon, TemplateIcon, WifiIcon } from '@heroicons/vue/outline'

export default {
    name: 'DeviceOverview',
    props: ['device'],
    components: {
        FormHeading,
        ProjectStatusBadge,
        CheckCircleIcon,
        ExclamationIcon,
        TemplateIcon,
        WifiIcon
    },
    computed: {
        updateNeeded: function () {
            return this.device.activeSnaphot !== this.device.targetSnapshot
        }
    }
}
</script>
