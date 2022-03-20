<template>
    <div class="mx-auto flex-grow flex items-center justify-center bg-gray-50 py-12">
        <div class="sm:w-72 w-screen space-y-2">
            <template v-if="!pending">
                <div class="max-w-xs mx-auto w-full mb-4">
                    <FlowForgeLogo/>
                    <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                        <span>FLOW</span><span class="font-light">FORGE</span>
                    </h2>
                </div>
                <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
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
            </template>
            <template v-else>
                <div class="flex justify-center">
                    <div class="w-1/2"><FlowForgeLogo /></div>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import FlowForgeLogo from '@/components/Logo'
import FormRow from '@/components/FormRow'
import userApi from '@/api/user'

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
            if (this.input.password !== this.input.confirm) {
                this.errors.confirm = 'Passwords do not match'
                return false
            }
            userApi.resetPassword(this.$route.params.token, {
                password: this.input.password
            }).then((res) => {
                this.complete = true
            }).catch(e => {
                console.log(e)
            })
        },
        focusEmail () {
            document.getElementById('new_password').focus()
        }
    },
    mounted () {
        this.focusEmail()
    },
    computed: mapState('account', ['settings', 'pending']),
    components: {
        FlowForgeLogo,
        FormRow
    }
}
</script>
