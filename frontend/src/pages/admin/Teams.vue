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
    name: 'AdminTeams',
    mixins: [ Breadcrumbs ],
    created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin"}},
            {label:"Teams"}
        ]);
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
