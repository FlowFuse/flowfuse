<template>
    <form class="space-y-6">
        <FormHeading>Teams</FormHeading>
    </form>
</template>

<script>
import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

export default {
    name: 'OrgTeams',
    data() {
        return {}
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
