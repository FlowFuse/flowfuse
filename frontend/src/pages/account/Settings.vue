<template>
    <form class="space-y-6">
        <FormHeading>Profile</FormHeading>
        <FormRow v-model="input.username" id="username">Name</FormRow>
        <FormRow v-model="input.email" id="email">Email</FormRow>
    </form>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'AccountSettings',
    mixins: [Breadcrumbs],
    data() {
        const currentUser = this.$store.getters['account/user'];
        return {
            input: {
                username: currentUser.name,
                email: currentUser.email
            }
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
