<template>
    <div class="flex align-center space-x-2">
        <a :href="project.url" target="_blank" class="forge-button-tertiary py-2">
            <ExternalLinkIcon class="w-4 mr-1" /><span class="ml-1">Open Editor</span>
        </a>
        <DropdownMenu buttonClass="forge-button-tertiary" alt="Open actions menu" :options="options">Actions</DropdownMenu>
    </div>
    <pre class="overflow-x-scroll">{{ project }}</pre>
</template>

<script>
import projectApi from '@/api/project'
import DropdownMenu from '@/components/DropdownMenu'
import { ExternalLinkIcon, ClipboardCopyIcon } from '@heroicons/vue/outline'
import FormHeading from '@/components/FormHeading'
import FormRow from '@/components/FormRow'

export default {
    name: 'ProjectOverview',
    props:[ "project" ],
    computed: {
        options: function() {
            return [
                {name: "Start", action: async() => { await projectApi.startProject(this.project.id) } },
                {name: "Restart", action: async() => { await projectApi.restartProject(this.project.id) } },
                {name: "Stop", action: async() => { await projectApi.stopProject(this.project.id) } }
            ]
        }
    },
    components: {
        FormHeading,
        ExternalLinkIcon,
        ClipboardCopyIcon,
        DropdownMenu
    },
}
</script>
