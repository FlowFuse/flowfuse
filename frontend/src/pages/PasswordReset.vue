<template>
    <div class="mx-auto flex-grow flex items-center justify-center bg-gray-50 py-12">
        <div class="sm:w-72 w-screen space-y-2">
            <template v-if="!pending">
                <div class="max-w-xs mx-auto w-full mb-4">
                    <Logo/>
                    <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                        <span>FLOW</span><span class="font-light">FORGE</span>
                    </h2>
                </div>
                <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
                    <FormRow id="new_password" type="password" :error="errors.password" v-model="input.password">New Password</FormRow>
                    <FormRow id="confirm_password" type="password" :error="errors.confirm" v-model="input.confirm">Confirm</FormRow>
                    <button type="button" @click="resetPassword" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700">
                        Submit
                    </button>
                    <div v-if="flash" v-text="flash" class="font-medium"></div>
                </form>
            </template>
            <template v-else>
                <div class="flex justify-center">
                    <div class="w-1/2"><Logo /></div>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Logo from '@/components/Logo'
import FormRow from '@/components/FormRow'
import userApi from '@/api/user'

export default {
    name: 'PasswordRequest',
    data() {
        return {
            input: {
                password: '',
                confirm: ''
            },
            errors: {
                password: null,
                confirm: null
            },
            flash: ''
        }
    },
    methods: {
        resetPassword() {
            this.errors.password = ''
            this.errors.confirm = ''

            console.log('ben')

            if (this.input.email === '') {
                this.errors.password = 'Enter a new password'
                return false
            }
            if (this.input.password.length < 8) {
                this.errors.password = 'Password too short'
                console.log('short')
                return false
            }
            if (this.input.password !== this.input.confirm) {
                this.errors.confirm = 'Passwords do not match'
                console.log('mismatch')
                return false
            }

            console.log('bill')

            userApi.resetPassword({ password: this.input.password }).then((res) => {
                console.log('Done!')
                document.location = res.url
            }).catch(e => {
                this.errors.email = ''
                console.log(e)
            })
        },
        focusEmail() {
            document.getElementById('reset_email').focus()
        }
    },
    mounted() {
        this.focusEmail()
    },
    computed: mapState('account',['settings', 'pending']),
    components: {
        Logo,
        FormRow
    }
}
</script>
