<template>
    <form class="space-y-6">
        <FormHeading>Some top-level settings</FormHeading>
        <FormRow>Credit card number</FormRow>
    </form>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'OrgSettings',
    mixins: [Breadcrumbs],
    data() {
        return {
        }
    },
    created() {
        this.replaceLastBreadcrumb({ label:"Settings" })
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
