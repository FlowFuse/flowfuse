<template>
    <form class="space-y-6" ref="password_form" @submit.prevent>
        <div>You must set a new password before continuing</div>
        <FormRow
            type="password"
            @enter="focusPassword"
            :error="errors.old_password"
            v-model="input.old_password"
            ref="row-old"
            container-class="max-w-full"
        >
            Old Password
        </FormRow>
        <FormRow
            type="password"
            @enter="focusConfirmPassword"
            :error="errors.password"
            v-model="input.password"
            ref="row-new"
            container-class="max-w-full"
        >
            New Password
        </FormRow>
        <FormRow
            type="password"
            @enter="changePassword"
            :error="errors.password_confirm"
            v-model="input.password_confirm"
            ref="row-confirm"
            container-class="max-w-full"
        >
            Confirm
        </FormRow>
        <ff-button @click="changePassword" type="submit">
            Change Password
        </ff-button>
        <ff-button kind="tertiary" @click="logout">Log out</ff-button>
        <div v-if="errors.password_change" class="ml-4 text-red-400 font-medium inline text-sm">{{ errors.password_change }}</div>
    </form>
</template>

<script>
import { mapState } from 'vuex'

import userApi from '../../api/user.js'
import store from '../../store/index.js'
import FormRow from '../FormRow.vue'

export default {
    name: 'UpdateExpiredPassword',
    computed: mapState('account', ['loginError']),
    data () {
        return {
            input: {
                username: '',
                password: ''
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
                this.$store.dispatch('account/checkState')
                this.$router.go()
            }).catch(e => {
                this.errors.password_change = 'Password change failed'
                console.error(e)
            })
        },
        focusOldPassword () {
            this.$refs['row-old'].focus()
        },
        focusPassword () {
            this.$refs['row-new'].focus()
        },
        focusConfirmPassword () {
            this.$refs['row-confirm'].focus()
        },
        logout () {
            store.dispatch('account/logout')
        }
    },
    mounted () {
        setTimeout(() => {
            this.focusOldPassword()
        }, 50)
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
