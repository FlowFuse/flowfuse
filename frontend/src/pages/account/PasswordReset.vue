<template>
    <ff-layout-box class="ff-setup">
        <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <template v-if="complete">
                <p class="text-center">Password reset successful.</p>
                <ff-button to="/">Return Home</ff-button>
            </template>
            <template v-else>
                <FormRow id="new_password" v-model="input.password" type="password" :error="errors.password">New Password</FormRow>
                <FormRow id="confirm_password" v-model="input.confirm" type="password" :error="errors.confirm">Confirm</FormRow>
                <ff-button @click="resetPassword">
                    Change password
                </ff-button>
            </template>
        </form>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'

import userApi from '../../api/user.js'
import FormRow from '../../components/FormRow.vue'

import FFLayoutBox from '../../layouts/Box.vue'
import alerts from '../../services/alerts.js'

export default {
    name: 'PasswordRequest',
    components: {
        'ff-layout-box': FFLayoutBox,
        FormRow
    },
    data () {
        return {
            input: {
                password: '',
                confirm: ''
            },
            errors: {
                password: null,
                confirm: null
            },
            complete: false
        }
    },
    computed: mapState('account', ['settings', 'pending']),
    methods: {
        resetPassword () {
            this.errors.password = ''
            this.errors.confirm = ''

            if (this.input.password === '') {
                this.errors.password = 'Enter a new password'
                return false
            }
            if (this.input.password.length < 8) {
                this.errors.password = 'Password too short'
                return false
            }
            if (this.input.password.length > 1024) {
                this.errors.password = 'Password too long'
                return false
            }
            if (this.input.password !== this.input.confirm) {
                this.errors.confirm = 'Passwords do not match'
                return false
            }
            userApi.resetPassword(this.$route.params.token, {
                password: this.input.password
            }).then((res) => {
                this.complete = true
                alerts.emit('Password successfully updated.', 'confirmation')
            }).catch(e => {
                console.error(e)
            })
        }
    }
}
</script>
