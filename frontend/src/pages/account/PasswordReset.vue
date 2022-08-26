<template>
    <ff-layout-box class="ff-setup">
        <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <template v-if="complete">
                <p class="text-center">Password reset successful.</p>
                <ff-button to="/">Return Home</ff-button>
            </template>
            <template v-else>
                <FormRow id="new_password" type="password" :error="errors.password" v-model="input.password">New Password</FormRow>
                <FormRow id="confirm_password" type="password" :error="errors.confirm" v-model="input.confirm">Confirm</FormRow>
                <ff-button @click="resetPassword">
                    Change password
                </ff-button>
            </template>
        </form>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'
import alerts from '@/services/alerts'
import FormRow from '@/components/FormRow'
import userApi from '@/api/user'

import FFLayoutBox from '@/layouts/Box'

export default {
    name: 'PasswordRequest',
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
                console.log(e)
            })
        }
    },
    computed: mapState('account', ['settings', 'pending']),
    components: {
        'ff-layout-box': FFLayoutBox,
        FormRow
    }
}
</script>
