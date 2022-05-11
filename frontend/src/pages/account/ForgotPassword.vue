<template>
    <ff-layout-box>
        <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <div v-if="flash" v-text="flash" class="font-medium"></div>
            <template v-else>
                <FormRow id="reset_email" :error="errors.email" v-model="input.email">Email address</FormRow>
                <ff-button @click="requestPasswordReset">
                    Send reset link
                </ff-button>
            </template>
        </form>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import userApi from '@/api/user'

import FFLayoutBox from '@/layouts/Box'

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
        }
    },
    computed: mapState('account', ['settings', 'pending']),
    components: {
        'ff-layout-box': FFLayoutBox,
        FormRow
    }
}
</script>
