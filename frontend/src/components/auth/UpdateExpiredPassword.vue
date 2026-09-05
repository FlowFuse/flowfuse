<template>
    <form class="space-y-6" ref="password_form" @submit.prevent>
        <div>{{ $t('ui.youMustSetANewPasswordBeforeContinuing') }}</div>
        <FormRow
            type="password"
            @enter="focusPassword"
            :error="errors.old_password"
            v-model="input.old_password"
            ref="row-old"
            container-class="max-w-full"
        >
            {{ $t('ui.oldPassword') }}
        </FormRow>
        <FormRow
            type="password"
            @enter="focusConfirmPassword"
            :error="errors.password"
            v-model="input.password"
            ref="row-new"
            container-class="max-w-full"
        >
            {{ $t('ui.newPassword') }}
        </FormRow>
        <FormRow
            type="password"
            @enter="changePassword"
            :error="errors.password_confirm"
            v-model="input.password_confirm"
            ref="row-confirm"
            container-class="max-w-full"
        >
            {{ $t('ui.confirm') }}
        </FormRow>
        <ff-button @click="changePassword" type="submit">
            {{ $t('ui.changePassword2') }}
        </ff-button>
        <ff-button kind="tertiary" @click="logout">{{ $t('ui.logOut') }}</ff-button>
        <div v-if="errors.password_change" class="ml-4 text-red-400 font-medium inline text-sm">{{ errors.password_change }}</div>
    </form>
</template>

<script>
import { mapState } from 'pinia'

import userApi from '../../api/user.js'
import { t } from '../../i18n.js'
import FormRow from '../FormRow.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'

export default {
    name: 'UpdateExpiredPassword',
    computed: {
        ...mapState(useAccountAuthStore, ['loginError'])
    },
    data () {
        return {
            input: {
                username: '',
                password: ''
            },
            errors: {
                username: null,
                password: null
            }
        }
    },
    methods: {
        changePassword () {
            this.errors.old_password = ''
            this.errors.password = ''
            this.errors.password_confirm = ''
            this.errors.password_change = ''

            if (this.input.old_password === '') {
                this.errors.old_password = t('ui.enterYourCurrentPassword')
                return false
            }
            if (this.input.password === '') {
                this.errors.password = t('ui.enterANewPassword')
                return false
            }
            if (this.input.password.length < 8) {
                this.errors.password = t('ui.passwordTooShort')
                return false
            }
            if (this.input.password !== this.input.password_confirm) {
                this.errors.password_confirm = t('ui.passwordsDoNotMatch')
                return false
            }
            userApi.changePassword(this.input.old_password, this.input.password).then(() => {
                useAccountAuthStore().checkState()
                this.$router.go()
            }).catch(e => {
                this.errors.password_change = t('ui.passwordChangeFailed')
                console.error(e)
            })
        },
        focusOldPassword () {
            this.$refs['row-old'].focus()
        },
        focusPassword () {
            this.$refs['row-new'].focus()
        },
        focusConfirmPassword () {
            this.$refs['row-confirm'].focus()
        },
        logout () {
            useAccountAuthStore().logout()
        }
    },
    mounted () {
        setTimeout(() => {
            this.focusOldPassword()
        }, 50)
    },
    watch: {
        loginError (newError, oldError) {
            this.focusOldPassword()
            this.errors.username = t('ui.loginFailed')
        }
    },
    components: {
        FormRow
    }
}
</script>
