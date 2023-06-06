<template>
    <FolderIcon v-if="type === 'folder'" class="ff-icon"/>
    <ProjectIcon v-if="type === 'flows'" class="ff-icon"/>
    <CodeIcon v-if="type === 'functions'" class="ff-icon"/>
</template>

<script>

import { CodeIcon, FolderIcon } from '@heroicons/vue/solid'

import ProjectIcon from '../../../components/icons/Projects.js'

export default {
    name: 'LibraryEntryTypeIcon',
    inheritAttrs: false,
    props: {
        type: {
            required: true,
            type: String
        }
    },
    components: {
        FolderIcon,
        CodeIcon,
        ProjectIcon
    }
}
</script>
