<template>
    <form class="space-y-6">
        <FormHeading>Teams</FormHeading>
        <i>Not implemented yet</i>
    </form>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'OrgTeams',
    mixins: [Breadcrumbs],
    data() {
        return {}
    },
    created() {
        this.replaceLastBreadcrumb({ label:"Teams" })
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
