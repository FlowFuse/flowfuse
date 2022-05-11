<template>
    <form class="space-y-6">
        <div>You must set a new password before continuing</div>
        <FormRow type="password" :onEnter="focusPassword" :error="errors.old_password" v-model="input.old_password" id="old_password">Old Password</FormRow>
        <FormRow type="password" :onEnter="focusConfirmPassword" :error="errors.password" v-model="input.password" id="password">New Password</FormRow>
        <FormRow type="password" :onEnter="changePassword" :error="errors.password_confirm" v-model="input.password_confirm" id="password_confirm">Confirm</FormRow>
        <ff-button @click="changePassword">
            Change Password
        </ff-button>
        <div v-if="errors.password_change" class="ml-4 text-red-400 font-medium inline text-sm">{{errors.password_change}}</div>
    </form>
</template>

<script>
import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import userApi from '@/api/user'

export default {
    name: 'UpdateExpiredPassword',
    computed: mapState('account', ['loginError']),
    data () {
        return {
            input: {
                username: '',
                password: '',
                remember: false
            },
            errors: {
                username: null,
                password: null
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
                this.errors.password = 'Password too short'
                return false
            }
            if (this.input.password !== this.input.password_confirm) {
                this.errors.password_confirm = 'Passwords do not match'
                return false
            }
            userApi.changePassword(this.input.old_password, this.input.password).then(() => {
                console.log('DONE!')
                this.$store.dispatch('account/checkState')
                this.$router.go()
            }).catch(e => {
                this.errors.password_change = 'Password change failed'
                console.log(e)
            })
        },
        focusOldPassword () {
            document.getElementById('old_password').focus()
        },
        focusPassword () {
            document.getElementById('password').focus()
        },
        focusConfirmPassword () {
            document.getElementById('password_confirm').focus()
        }
    },
    mounted () {
        this.focusOldPassword()
    },
    watch: {
        loginError (newError, oldError) {
            this.focusOldPassword()
            this.errors.username = 'Login failed'
        }
    },
    components: {
        FormRow
    }
}
</script>
