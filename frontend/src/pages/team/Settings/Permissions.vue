<template>
    <form class="space-y-6">
        <FormHeading>Application Creation</FormHeading>
        <FormRow id="teamName" v-model="input.teamName" type="checkbox">
            Limit application creation
            <template #description>
            </template>
        </FormRow>
    </form>
</template>

<script>
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'

export default {
    name: 'TeamSettingsPermissions',
    props: ['team'],
    data () {
        return {
            input: {
                allowMembers: false
            }
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
