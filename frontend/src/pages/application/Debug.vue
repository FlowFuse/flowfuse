<template>
    <p class="mb-4 italic text-red-800">This is a temporary view that displays the raw application object.</p>
    <pre class="overflow-x-scroll">{{ project }}</pre>
</template>

<script>

export default {
    name: 'ProjectDebug',
    props: ['project']
}
</script>
