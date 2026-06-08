<template>
    <FolderIcon v-if="type === 'folder'" class="ff-icon" />
    <ProjectIcon v-if="type === 'flows'" class="ff-icon" />
    <CodeBracketIcon v-if="type === 'functions'" class="ff-icon" />
</template>

<script>

import { CodeBracketIcon, FolderIcon } from '@heroicons/vue/20/solid'

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
        CodeBracketIcon,
        ProjectIcon
    }
}
</script>
