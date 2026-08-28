<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4 pt-4">
        <FormHeading>{{ $t('ui.n1CreateAdministratorUser') }}</FormHeading>
        <template v-if="!state.adminUser">
            <FormRow v-model="input.username" class="max-w-full!" :error="errors.username">
                {{ $t('ui.username') }}
                <template #description>{{ $t('ui.uniqueShortNoSpacesCannotBeAdminOrRoot') }}</template>
            </FormRow>
            <FormRow v-model="input.name" class="max-w-full!" :placeholder="input.username">
                {{ $t('ui.fullName') }}
            </FormRow>
            <FormRow v-model="input.email" class="max-w-full!" :error="errors.email">
                {{ $t('ui.email') }}
                <template v-if="!state.email" #description>
                    <div class="text-red-400">{{ $t('ui.emailHasNotBeConfiguredThisWillLimitAvailableFea') }}</div>
                </template>
            </FormRow>
            <FormRow id="password" v-model="input.password" class="max-w-full!" type="password" :error="errors.password" :onBlur="checkPassword">
                {{ $t('ui.password') }}
                <template #description>{{ $t('ui.atLeast8Characters') }}</template>
            </FormRow>
            <FormRow id="password_confirm" v-model="input.password_confirm" class="max-w-full!" type="password" :error="errors.password_confirm">{{ $t('ui.confirmPassword') }}</FormRow>
            <ff-button :disabled="!formValid" class="mt-6" @click="createUser()">
                {{ $t('ui.next') }}
            </ff-button>
        </template>
        <template v-else>
            <p class="text-center">{{ $t('ui.youHaveAlreadyCreatedAnAdminUser') }}</p>
            <div class="flex justify-center">
                <ff-button class="mt-3" @click="next()">
                    {{ $t('ui.next') }}
                </ff-button>
            </div>
        </template>
    </form>
</template>

<script>
import httpClient from '../../api/client.js'
import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'
import { t } from '../../i18n.js'

let zxcvbn

export default {
    name: 'CreateAdminUser',
    components: {
        FormHeading,
        FormRow
    },
    props: {
        state: {
            type: Object,
            required: true
        }
    },
    emits: ['next'],
    data () {
        return {
            input: {
                name: '',
                username: '',
                email: '',
                password: '',
                password_confirm: ''
                // isAdmin: false,
                // createDefaultTeam: true
            },
            errors: {}
        }
    },
    computed: {
        formValid () {
            return this.input.email &&
                   (this.input.username && !this.errors.username) &&
                   this.input.password !== '' &&
                   this.input.password === this.input.password_confirm &&
                   !this.errors.password
        }
    },
    watch: {
        'input.username': function (v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.username = t('ui.mustOnlyContainAZAZ09')
            } else {
                this.errors.username = ''
            }
        },
        'input.email': function (v) {
            if (v && !/.+@.+/.test(v)) {
                this.errors.email = t('ui.enterAValidEmailAddress')
            } else {
                this.errors.email = ''
            }
        },
        'input.password': function (v) {
            if (this.errors.password && v.length >= 8 && zxcvbn(v).score >= 2) {
                this.errors.password = ''
            }
            if (v === this.input.username) {
                this.errors.password = t('ui.passwordMustNotMatchUsername')
            }
            if (v === this.input.email) {
                this.errors.password = t('ui.passwordMustNotMatchEmail')
            }
        }
    },
    async mounted () {
        const { default: zxcvbnImp } = await import('zxcvbn')
        zxcvbn = zxcvbnImp
    },
    methods: {
        next () {
            this.$emit('next')
        },
        checkPassword () {
            if (this.input.password && this.input.password.length < 8) {
                this.errors.password = t('ui.passwordMustBeAtLeast8Characters')
                return
            } else {
                this.errors.password = ''
            }
            if (this.input.password && this.input.password.length > 128) {
                this.errors.password = t('ui.passwordTooLong')
                return
            } else {
                this.errors.password = ''
            }
            if (this.input.password === this.input.username) {
                this.errors.password = t('ui.passwordMustNotMatchUsername')
                return
            }
            if (this.input.password === this.input.email) {
                this.errors.password = t('ui.passwordMustNotMatchEmail')
                return
            }
            const zxcvbnResult = zxcvbn(this.input.password)
            if (zxcvbnResult.score < 2) {
                this.errors.password = `Password too weak, ${zxcvbnResult.feedback.suggestions[0]}`
            } else {
                this.errors.password = ''
            }
        },
        createUser () {
            // eslint-disable-next-line no-undef
            const opts = { _csrf: SETUP_CSRF_TOKEN, ...this.input, name: this.input.name || this.input.username }
            delete opts.password_confirm

            return httpClient.post('/setup/create-user', opts).then(res => {
                this.$emit('next')
            }).catch(err => {
                if (err.response?.data) {
                    if (/username/.test(err.response.data.error)) {
                        this.errors.username = t('ui.usernameUnavailable')
                    } else if (/password/.test(err.response.data.error)) {
                        this.errors.password = t('ui.invalidUsername')
                    } else if (err.response.data.error === 'email must be unique') {
                        this.errors.email = t('ui.emailAlreadyRegistered')
                    } else {
                        this.errors.username = err.response.data.error
                    }
                }
            })
        }
    }
}
</script>
