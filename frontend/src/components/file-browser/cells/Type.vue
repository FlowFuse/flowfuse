<template>
    <DocumentIcon v-if="type === 'file'" class="ff-icon text-gray-600" />
    <FolderIcon v-if="type === 'directory'" class="ff-icon text-blue-600" />
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
