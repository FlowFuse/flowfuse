<template>
    <form class="space-y-6">
        <FormHeading>Profile</FormHeading>
        <FormRow v-model="input.name" id="name">Name</FormRow>
        <FormRow v-model="input.email" id="email">Email</FormRow>
    </form>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

export default {
    name: 'AccountSettings',

    data() {
        const currentUser = this.$store.getters['account/user'];
        return {
            input: {
                name: currentUser.name,
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
