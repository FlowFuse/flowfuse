<template>
    <template v-if="ownerType==='instance'">
        <router-link :to="{ name: 'instance-devices', params: { id: instance.id }}"><ProjectsIcon class="ff-icon relative top-0.5" /> <span class="ml-4">{{ instance.name }}</span></router-link>
    </template>
    <template v-else-if="ownerType==='application'">
        <router-link :to="{ name: 'ApplicationDevices', params: { id: application.id }}"><TemplateIcon class="ff-icon relative -top-0.5" /> <span class="ml-4">{{ application.name }}</span></router-link>
    </template>
    <template v-else><div class="w-5 inline-block mr-0.5">&nbsp;</div> <span class="text-gray-400 ml-4 italic">Unassigned</span></template>
</template>

<script>

import { TemplateIcon } from '@heroicons/vue/outline'

import ProjectsIcon from '../../../../components/icons/Projects.js'

export default {
    name: 'DeviceAssignedToLink',
    components: { TemplateIcon, ProjectsIcon },
    inheritAttrs: false,
    props: {
        ownerType: {
            type: String,
            default: null
        },
        application: {
            type: Object,
            default: null
        },
        instance: {
            type: Object,
            default: null
        }
    }
}
</script>
