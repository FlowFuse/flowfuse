<template>
    <form class="space-y-6">
        <FormHeading>Application Creation</FormHeading>
        <FormRow id="teamName" v-model="input.teamName" type="checkbox">
            Limit application creation
            <template #description />
        </FormRow>
    </form>
</template>

<script>
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'

export default {
    name: 'TeamSettingsPermissions',
    components: {
        FormRow,
        FormHeading
    },
    data () {
        return {
            input: {
                allowMembers: false
            }
        }
    }
}
</script>
