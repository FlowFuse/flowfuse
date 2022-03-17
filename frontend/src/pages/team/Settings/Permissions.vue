<template>
    <form class="space-y-6">
        <FormHeading>Project Creation</FormHeading>
        <FormRow v-model="input.teamName" id="teamName" type="checkbox">
            Limit project creation
            <template v-slot:description>
            </template>
        </FormRow>
    </form>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

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
