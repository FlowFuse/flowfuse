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
                    <div v-if="flash" v-text="flash" class="font-medium"></div>
                    <template v-else>
                        <FormRow id="reset_email" :error="errors.email" v-model="input.email">Email address</FormRow>
                        <button type="button" @click="requestPasswordReset" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700">
                            Send reset link
                        </button>
                    </template>
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
import FlowForgeLogo from '@/components/Logo'
import FormRow from '@/components/FormRow'
import userApi from '@/api/user'

export default {
    name: 'PasswordRequest',
    data () {
        return {
            input: {
                email: ''
            },
            errors: {
                email: null
            },
            flash: ''
        }
    },
    methods: {
        requestPasswordReset () {
            this.errors.email = ''
            if (this.input.email === '') {
                this.errors.email = 'Enter email address'
                return false
            }
            userApi.requestPasswordReset({ email: this.input.email }).then(() => {
                // show message
                this.flash = 'We have sent you an email with instructions to reset your password'
            }).catch(e => {
                this.errors.email = ''
                console.log(e)
            })
        },
        focusEmail () {
            document.getElementById('reset_email').focus()
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
