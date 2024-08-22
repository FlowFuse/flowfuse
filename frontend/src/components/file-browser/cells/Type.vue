<template>
    <DocumentIcon v-if="type === 'file'" class="ff-icon" />
    <FolderIcon v-if="type === 'directory'" class="ff-icon" />
</template>

<script>

import { DocumentIcon, FolderIcon } from '@heroicons/vue/outline'

export default {
    name: 'FileBrowserCellType',
    components: {
        DocumentIcon,
        FolderIcon
    },
    inheritAttrs: false,
    props: {
        type: {
            required: true,
            type: String
        }
    }
}
</script>
