<template>
    <pre class="overflow-x-scroll">{{ project }}</pre>
</template>

<script>

import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'ProjectDebug',
    mixins: [Breadcrumbs],
    props:[ "project" ],
    created() {
        this.replaceLastBreadcrumb({ label:"Debug" })
    }
}
</script>
