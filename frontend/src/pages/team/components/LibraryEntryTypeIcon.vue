<template>
    <FolderIcon v-if="type === 'folder'" class="ff-icon"/>
    <ProjectIcon v-if="type === 'flows'" class="ff-icon"/>
    <CodeIcon v-if="type === 'functions'" class="ff-icon"/>
</template>

<script>

import { FolderIcon, CodeIcon } from '@heroicons/vue/solid'
import ProjectIcon from '@/components/icons/Projects'

export default {
    name: 'LibraryEntryTypeIcon',
    props: {
        type: {
            required: true,
            type: String
        },
        name: {
            // not used, but passed in data row
            type: String
        },
        path: {
            // not used, but passed in data row
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
