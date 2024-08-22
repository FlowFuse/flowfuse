<template>
    {{ formattedSize }}
</template>

<script>

export default {
    name: 'FileBrowserCellSize',
    inheritAttrs: false,
    props: {
        size: {
            default: null,
            type: Number
        }
    },
    computed: {
        formattedSize () {
            const bytes = parseInt(this.size)
            if (isNaN(bytes)) {
                return ''
            }
            if (bytes === 0) {
                return '0 B'
            }
            const k = 1024
            const dm = 2
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
        }
    }
}
</script>
