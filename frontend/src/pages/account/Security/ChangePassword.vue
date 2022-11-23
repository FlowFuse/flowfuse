<template>
    <ff-loading v-if="loading" message="Changing Password..." />
    <form v-else class="space-y-6">
        <FormHeading>Change password</FormHeading>
        <FormRow type="password" :error="errors.old_password" v-model="input.old_password" id="old_password">Old Password</FormRow>
        <FormRow type="password" :error="errors.password" v-model="input.password" id="password">New Password</FormRow>
        <FormRow type="password" :error="errors.password_confirm" v-model="input.password_confirm" id="password_confirm">Confirm</FormRow>
        <ff-button @click="changePassword">
            Change password
        </ff-button>
        <div v-if="errors.password_change" class="ml-4 text-red-400 font-medium inline text-sm">{{errors.password_change}}</div>
        <div v-if="changeComplete" class="ml-4 font-medium inline text-md">Password changed</div>
    </form>
</template>

<script>
import userApi from '@/api/user'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

export default {
    name: 'AccountSecurityChangePassword',

    data () {
        return {
            loading: false,
            changeComplete: false,
            errors: {
                old_password: '',
                password: '',
                password_confirm: '',
                password_change: ''
            },
            input: {
                old_password: '',
                password: '',
                password_confirm: ''
            }
        }
    },
    methods: {
        changePassword () {
            this.errors.old_password = ''
            this.errors.password = ''
            this.errors.password_confirm = ''
            this.errors.password_change = ''

            if (this.input.old_password === '') {
                this.errors.old_password = 'Enter your current password'
                return false
            }
            if (this.input.password === '') {
                this.errors.password = 'Enter a new password'
                return false
            }
            if (this.input.password.length < 8) {
                this.errors.password = 'Password too short (min. 8 characters)'
                return false
            }
            if (this.input.password !== this.input.password_confirm) {
                this.errors.password_confirm = 'Passwords do not match'
                return false
            }
            this.loading = true
            userApi.changePassword(this.input.old_password, this.input.password).then(() => {
                this.input.password = ''
                this.input.old_password = ''
                this.input.password_confirm = ''
                this.changeComplete = true
            }).catch(e => {
                this.changeComplete = false
                this.errors.password_change = 'Password change failed'
                console.log(e)
            }).finally(() => {
                this.loading = false
            })
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
