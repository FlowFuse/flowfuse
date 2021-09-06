<template>
    <pre>{{ team }}</pre>
</template>

<script>

import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'TeamOverview',
    mixins: [Breadcrumbs],
    props:[ "team" ],
    created() {
        this.replaceLastBreadcrumb({ label:"Overview" })
    }
}
</script>
