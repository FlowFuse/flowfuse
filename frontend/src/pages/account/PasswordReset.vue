<template>
    <ff-layout-box class="ff-login">
        <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <template v-if="complete">
                <p class="text-center">Password reset successful.</p>
                <ff-button to="/">Return Home</ff-button>
            </template>
            <template v-else>
                <FormRow id="new_password" v-model="input.password" type="password" :error="errors.password">New Password</FormRow>
                <FormRow id="confirm_password" v-model="input.confirm" type="password" :error="errors.confirm">Confirm</FormRow>
                <ff-button :disabled="!formValid" @click="resetPassword">
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

let zxcvbn

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
    computed: {
        ...mapState('account', ['settings', 'pending']),
        formValid () {
            return this.input.password &&
                   (this.input.password === this.input.confirm) &&
                   !this.errors.password
        }
    },
    watch: {
        'input.password': function (v) {
            if (this.input.password.length < 8) {
                this.errors.password = 'Password must be at least 8 characters'
                return
            }
            if (this.input.password.length > 128) {
                this.errors.password = 'Password too long'
                return
            }
            const zxcvbnResult = zxcvbn(this.input.password)
            if (zxcvbnResult.score < 2) {
                this.errors.password = `Password too weak, ${zxcvbnResult.feedback.suggestions[0]}`
                return
            }
            this.errors.password = ''
        }
    },
    async mounted () {
        const { default: zxcvbnImp } = await import('zxcvbn')
        zxcvbn = zxcvbnImp
    },
    methods: {
        resetPassword () {
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
