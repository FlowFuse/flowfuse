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
                    <FormRow id="reset_email" :error="errors.email" v-model="input.email">Email address</FormRow>
                    <button type="button" @click="login" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700">
                        <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                            <LockClosedIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
                        </span>
                        Submit
                    </button>
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
import { LockClosedIcon } from '@heroicons/vue/outline'
import FormRow from '@/components/FormRow'
import userApi from '@/api/user'

export default {
    name: 'PasswordRequest',
    data() {
        return {
            input: {
                reset_email: ''
            },
            errors: {
                email: null
            }
        }
    },
    methods: {
        requestPasswordReset() {
            this.errors.email = ''
            if (this.input.email === '') {
                this.errors.email = 'Enter email address'
                return false
            }
            userApi.requestPasswordReset({ email: this.input.email }).then(() => {
                console.log('Done!')
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
        LockClosedIcon,
        FormRow
    }
}
</script>
