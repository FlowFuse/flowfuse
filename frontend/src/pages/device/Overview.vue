<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="border rounded p-4">
            <FormHeading>
                <WifiIcon class="w-6 h-6 mr-2 inline text-gray-400" />
                Connection
            </FormHeading>

            <table class="table-fixed w-full" v-if="device">
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Last Seen</td>
                    <td class="py-2">
                        <DeviceLastSeenBadge :last-seen-at="device.lastSeenAt" :last-seen-ms="device.lastSeenMs" :last-seen-since="device.lastSeenSince" />
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Status</td>
                    <td class="py-2">
                        <InstanceStatusBadge :status="device.status"/>
                    </td>
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
                    <td class="w-1/4 font-medium">Application</td>
                    <td class="py-2">
                        <router-link v-if="device?.project" :to="{name: 'Application', params: { id: device.project.id }}">
                            {{ device.project?.name }}
                        </router-link>
                        <span v-else>None</span>
                    </td>
                </tr>
                <!-- TODO: Currently links to same object as project -->
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Instance</td>
                    <td class="py-2">
                        <router-link v-if="device?.project" :to="{name: 'Instance', params: { id: device.project.id }}">
                            {{ device.project?.name }}
                        </router-link>
                        <span v-else>None</span>
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Active Snapshot</td>
                    <td class="py-2 flex">
                        <span class="flex space-x-4 pr-2">
                            <span class="flex items-center space-x-2 text-gray-500 italic">
                                <ExclamationIcon class="text-yellow-600 w-4" v-if="!device.activeSnapshot || !targetSnapshotDeployed" />
                                <CheckCircleIcon class="text-green-700 w-4" v-else />
                            </span>
                        </span>
                        <template v-if="device.activeSnapshot">
                            <div class="flex flex-col">
                                <span>{{ device.activeSnapshot.name }}</span>
                                <span class="text-xs text-gray-500">{{ device.activeSnapshot.id }}</span>
                            </div>
                        </template>
                        <template v-else>
                            No Snapshot Deployed
                        </template>
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Target Snapshot</td>
                    <td class="py-2 flex">
                        <span class="flex space-x-4 pr-2">
                            <span class="flex items-center space-x-2 text-gray-500 italic">
                                <ExclamationIcon class="text-yellow-600 w-4" v-if="!device.targetSnapshot" />
                                <CheckCircleIcon class="text-green-700 w-4" v-else />
                            </span>
                        </span>
                        <template v-if="device.targetSnapshot">
                            <div class="flex flex-col">
                                <span>{{ device.targetSnapshot.name }}</span>
                                <span class="text-xs text-gray-500">{{ device.targetSnapshot.id }}</span>
                            </div>
                        </template>
                        <template v-else>
                            No Target Snapshot Set
                        </template>
                    </td>
                </tr>
            </table>
        </div>
    </div>
</template>

<script>

// utilities
import elapsedTime from '@/utils/elapsedTime'

// components
import FormHeading from '@/components/FormHeading'

import DeviceLastSeenBadge from './components/DeviceLastSeenBadge'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge'
import DeviceLastSeenBadge from '@/pages/device/components/DeviceLastSeenBadge'

// icons
import { CheckCircleIcon, ExclamationIcon, TemplateIcon, WifiIcon } from '@heroicons/vue/outline'

export default {
    name: 'DeviceOverview',
    props: ['device'],
    components: {
        FormHeading,
        InstanceStatusBadge,
        DeviceLastSeenBadge,
        CheckCircleIcon,
        ExclamationIcon,
        TemplateIcon,
        WifiIcon
    },
    computed: {
        targetSnapshotDeployed: function () {
            return this.device.activeSnapshot?.id === this.device.targetSnapshot?.id
        },
        lastSeen: function () {
            if (this.device?.lastSeenAt && typeof this.device?.lastSeenMs === 'number') {
                return elapsedTime(0, this.device.lastSeenMs) + ' ago'
            } else {
                return 'Not Available'
            }
        }
    }
}
</script>
