<template>
    <p class="mb-4 italic text-red-800">This is a history of deploy events. It could allow for rolling back to previous versions
    depending on what version control options we have.</p>
</template>

<script>

export default {
    name: 'ProjectAuditLog',
    props:[ "project" ]
}
</script>
