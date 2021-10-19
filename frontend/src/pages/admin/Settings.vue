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
    name: 'AdminSettings',
    mixins: [ Breadcrumbs ],
    data() {
        return {
        }
    },
    created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin"}},
            {label:"Settings"}
        ]);
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
