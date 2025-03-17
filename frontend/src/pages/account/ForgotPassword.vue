<template>
    <ff-layout-box class="ff-forgot-password ff--center-box">
        <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <div v-if="flash" class="font-medium" v-text="flash" />
            <template v-else>
                <FormRow id="reset_email" v-model="input.email" class="!max-w-full" :error="errors.email">Email address</FormRow>
                <ff-button :disabled="tooManyRequests" @click="requestPasswordReset">
                    <span>Send reset link</span>
                    <span class="w-4">
                        <SpinnerIcon v-if="tooManyRequests" class="ff-icon ml-3 !w-3.5" />
                    </span>
                </ff-button>
            </template>
        </form>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'

import userApi from '../../api/user.js'
import FormRow from '../../components/FormRow.vue'
import SpinnerIcon from '../../components/icons/Spinner.js'

import FFLayoutBox from '../../layouts/Box.vue'

export default {
    name: 'PasswordRequest',
    components: {
        SpinnerIcon,
        'ff-layout-box': FFLayoutBox,
        FormRow
    },
    data () {
        return {
            tooManyRequests: false,
            input: {
                email: ''
            },
            errors: {
                email: null
            },
            flash: ''
        }
    },
    computed: mapState('account', ['settings', 'pending']),
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
                this.tooManyRequests = true
                setTimeout(() => {
                    this.tooManyRequests = false
                }, 30000)
            }).catch(e => {
                this.errors.email = ''
                if (e.response?.status === 429) {
                    this.errors.email = 'Try again in 5 minutes'
                    this.tooManyRequests = true
                    setTimeout(() => {
                        this.tooManyRequests = false
                    }, 60000)
                } else {
                    console.error(e)
                }
            })
        }
    }
}
</script>
