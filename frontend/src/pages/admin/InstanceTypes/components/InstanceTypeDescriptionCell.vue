<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="list-disc " v-html="renderedDescription" />
</template>
<script>

const marked = require('marked')

export default {
    name: 'InstanceTypeDescriptionCell',
    props: {
        description: {
            type: String,
            default: ''
        }
    },
    computed: {
        renderedDescription () {
            return marked.parse(this.description)
        }
    }
}
</script>
