<template>
    <div class="list-disc " v-html='renderedDescription'></div>
</template>
<script>

const marked = require('marked')

export default {
    name: 'ProjectTypeDescriptionCell',
    props: ['description'],
    computed: {
        renderedDescription () {
            return marked.parse(this.description)
        }
    }
}
</script>
