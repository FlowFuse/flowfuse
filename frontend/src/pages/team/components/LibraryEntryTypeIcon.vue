<template>
    <FolderIcon v-if="type === 'folder'" class="ff-icon"/>
    <ProjectIcon v-if="type === 'flow'" class="ff-icon"/>
</template>

<script>

import { FolderIcon } from '@heroicons/vue/solid'
import ProjectIcon from '@/components/icons/Projects'

export default {
    name: 'LibraryEntryTypeIcon',
    props: {
        type: {
            required: true,
            type: String
        }
    },
    components: {
        FolderIcon,
        ProjectIcon
    }
}
</script>
