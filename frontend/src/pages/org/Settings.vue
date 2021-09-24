<template>
    <form class="space-y-6">
        <FormHeading>Some top-level settings</FormHeading>
        <FormRow>Credit card number</FormRow>
    </form>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

export default {
    name: 'OrgSettings',
    data() {
        return {
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
