<template>
    <form class="space-y-6">
        <FormHeading>Change password</FormHeading>
        <FormRow type="password" :error="errors.old_password" v-model="input.old_password" id="old_password">Old Password</FormRow>
        <FormRow type="password" :error="errors.password" v-model="input.password" id="password">New Password</FormRow>
        <FormRow type="password" :error="errors.password_confirm" v-model="input.password_confirm" id="password_confirm">Confirm</FormRow>
        <button type="button" @click="changePassword" class="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700">
            Change password
        </button>
        <div v-if="errors.password_change" class="ml-4 text-red-400 font-medium inline text-sm">{{errors.password_change}}</div>
    </form>
</template>

<script>
import { mapState } from 'vuex'
import userApi from '@/api/user'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

export default {
    name: 'AccountSecurityChangePassword',

    data() {
        const currentUser = this.$store.getters['account/user'];
        return {
            errors: {
                old_password: "",
                password: "",
                password_confirm: ""
            },
            input: {
                old_password: "",
                password: "",
                password_confirm: ""
            }
        }
    },
    methods: {
        changePassword() {
            this.errors.old_password = "";
            this.errors.password = "";
            this.errors.password_confirm = "";
            this.errors.password_change = "";

            if (this.input.old_password === "") {
                this.errors.old_password = "Enter your current password"
                return false
            }
            if (this.input.password === "") {
                this.errors.password = "Enter a new password"
                return false
            }
            if (this.input.password.length < 8) {
                this.errors.password = "Password too short"
                return false
            }
            if (this.input.password !== this.input.password_confirm) {
                this.errors.password_confirm = "Passwords do not match"
                return false
            }
            userApi.changePassword(this.input.old_password, this.input.password).then(() => {
                console.log("DONE!")
            }).catch(e => {
                this.errors.password_change = "Password change failed"
                console.log(e);
            })
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
