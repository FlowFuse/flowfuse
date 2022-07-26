<template>
    <div v-html="markdownToHtml"></div>
</template>

<script>
export default {
    name: 'ff-markdown-viewer',
    props: {
        content: {
            type: String
        }
    },
    computed: {
        markdownToHtml () {
            return this.md(this.content)
        }
    }
}
</script>
