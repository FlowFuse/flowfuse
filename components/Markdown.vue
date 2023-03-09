<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="markdownToHtml"></div>
</template>

<script>
export default {
    name: 'ff-markdown-viewer',
    props: {
        content: {
            required: true,
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
