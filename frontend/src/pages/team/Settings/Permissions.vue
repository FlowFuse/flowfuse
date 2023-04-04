<template>
    <form class="space-y-6">
        <FormHeading>Application Creation</FormHeading>
        <FormRow v-model="input.teamName" id="teamName" type="checkbox">
            Limit application creation
            <template v-slot:description>
            </template>
        </FormRow>
    </form>
</template>

<script>
import FormRow from '../../../components/FormRow.vue'
import FormHeading from '../../../components/FormHeading.vue'

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
