<template>
    <div class="flex items-center">
        <template v-if="ownerType==='instance'">
            <ProjectsIcon class="ff-icon relative top-0.5" />
            <router-link :to="{ name: 'Instance', params: { id: project.id }}">
                <div class="flex flex-col space-y-1 ml-3">
                    <div class="text-base">{{ project.name }}</div>
                    <div class="text-xs text-gray-400">instance</div>
                </div>
            </router-link>
        </template>
        <template v-else-if="ownerType==='device'">
            <ChipIcon class="ff-icon relative -top-0.5" />
            <router-link :to="{ name: 'Device', params: { id: device.id }}">
                <div class="flex flex-col space-y-1 ml-3">
                    <div class="text-base">{{ device.name }}</div>
                    <div class="text-xs text-gray-400">{{ device.type }}</div>
                </div>
            </router-link>
        </template>
        <template v-else>
            <div class="flex flex-col space-y-1 ml-4">
                <div class="text-gray-400 ml-4 italic">unassigned</div>
            </div>
        </template>
    </div>
</template>

<script>

import { ChipIcon } from '@heroicons/vue/outline'

import ProjectsIcon from '../../../../../components/icons/Projects.js'

export default {
    name: 'SnapshotSource',
    components: { ChipIcon, ProjectsIcon },
    inheritAttrs: false,
    props: {
        id: {
            required: true,
            type: String
        },
        ownerType: {
            type: String,
            default: null
        },
        device: {
            type: Object,
            default: null
        },
        project: {
            type: Object,
            default: null
        }
    }
}
</script>
