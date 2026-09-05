<template>
    <ff-layout-box class="ff-login">
        <form v-if="!appLoader" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <template v-if="complete">
                <p class="text-center">{{ $t('ui.passwordResetSuccessful') }}</p>
                <ff-button to="/">{{ $t('ui.returnHome') }}</ff-button>
            </template>
            <template v-else>
                <FormRow id="new_password" v-model="input.password" type="password" :error="errors.password">{{ $t('ui.newPassword') }}</FormRow>
                <FormRow id="confirm_password" v-model="input.confirm" type="password" :error="errors.confirm">{{ $t('ui.confirm') }}</FormRow>
                <ff-button :disabled="!formValid" @click="resetPassword">
                    {{ $t('ui.changePassword') }}
                </ff-button>
            </template>
        </form>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'pinia'

import userApi from '../../api/user.js'
import FormRow from '../../components/FormRow.vue'

import { t } from '../../i18n.js'
import FFLayoutBox from '../../layouts/Box.vue'
import alerts from '../../services/alerts.js'

import { useUxLoadingStore } from '@/stores/ux-loading.js'

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
        ...mapState(useUxLoadingStore, ['appLoader']),
        formValid () {
            return this.input.password &&
                   (this.input.password === this.input.confirm) &&
                   !this.errors.password
        }
    },
    watch: {
        'input.password': function (v) {
            if (this.input.password.length < 8) {
                this.errors.password = t('ui.passwordMustBeAtLeast8Characters')
                return
            }
            if (this.input.password.length > 128) {
                this.errors.password = t('ui.passwordTooLong')
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
                alerts.emit(t('ui.passwordSuccessfullyUpdated'), 'confirmation')
            }).catch(e => {
                console.error(e)
            })
        }
    }
}
</script>
