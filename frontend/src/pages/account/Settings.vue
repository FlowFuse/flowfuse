<template>
    <form class="space-y-6">
        <FormHeading>Profile</FormHeading>
        <FormRow v-model="input.username" id="username">Name</FormRow>
        <FormRow v-model="input.email" id="email">Email</FormRow>
    </form>
</template>

<script>
import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

export default {
    name: 'AccountSettings',
    data() {
        const currentUser = this.$store.getters['account/user'];
        return {
            input: {
                username: currentUser.name,
                email: currentUser.email
            }
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
