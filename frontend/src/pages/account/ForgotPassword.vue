<template>
    <ff-layout-box>
        <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <div v-if="flash" class="font-medium" v-text="flash" />
            <template v-else>
                <FormRow id="reset_email" v-model="input.email" class="!max-w-full" :error="errors.email">Email address</FormRow>
                <ff-button @click="requestPasswordReset">
                    Send reset link
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

export default {
    name: 'PasswordRequest',
    components: {
        'ff-layout-box': FFLayoutBox,
        FormRow
    },
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
            }).catch(e => {
                this.errors.email = ''
                if (e.response?.status === 429) {
                    this.errors.email = 'Try again in 5 minutes'
                } else {
                    console.error(e)
                }
            })
        }
    }
}
</script>
