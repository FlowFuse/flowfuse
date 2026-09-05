<template>
    <ff-page>
        <template #header>
            <ff-page-header>
                <template #breadcrumbs>
                    <div class="grow">
                        <div class="text-gray-800 text-xl">
                            <router-link class="ff-link font-bold" :to="{name: 'admin-users'}">{{ $t('ui.users') }}</router-link>
                            <ChevronRightIcon class="ff-icon" />
                            <span>{{ $t('ui.create') }}</span>
                        </div>
                    </div>
                </template>
            </ff-page-header>
        </template>
        <div class="max-w-2xl">
            <form class="space-y-6">
                <FormRow v-model="input.username" :error="errors.username">{{ $t('ui.username') }}</FormRow>
                <FormRow v-model="input.name" :placeholder="input.username" :error="errors.name">{{ $t('ui.fullName') }}</FormRow>
                <FormRow v-model="input.email" :error="errors.email">{{ $t('ui.email') }}</FormRow>
                <FormRow id="password" v-model="input.password" type="password" :error="errors.password">{{ $t('ui.password') }}</FormRow>
                <FormRow id="password_confirm" v-model="input.password_confirm" type="password" :error="errors.password_confirm">{{ $t('ui.confirmPassword') }}</FormRow>
                <FormRow id="isAdmin" v-model="input.isAdmin" type="checkbox">{{ $t('ui.administrator') }}</FormRow>
                <FormHeading>{{ $t('ui.teamOptions') }}</FormHeading>
                <FormRow id="createDefaultTeam" v-model="input.createDefaultTeam" type="checkbox">
                    {{ $t('ui.createPersonalTeam') }}
                    <template #description>{{ $t('ui.aUserNeedsToBeInATeamToCreateProjects') }}</template>
                </FormRow>
                <!-- <FormRow v-model="input.addToTeam">{{ $t('ui.addToExistingTeam') }}</FormRow> -->
                <ff-button :disabled="!formValid" @click="createUser()">
                    {{ $t('ui.createUser') }}
                </ff-button>
            </form>
        </div>
        <ConfirmAdminGrantDialog ref="confirmAdminDialog" @confirmed="handleAdminConfirmed" @cancel="handleAdminCanceled" />
    </ff-page>
</template>

<script>
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'

import usersApi from '../../../api/users.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'

import { t } from '../../../i18n.js'

import ConfirmAdminGrantDialog from './dialogs/ConfirmAdminGrantDialog.vue'

let zxcvbn

export default {
    name: 'AdminCreateUser',
    components: {
        ChevronRightIcon,
        FormRow,
        FormHeading,
        ConfirmAdminGrantDialog
    },
    data () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            teams: [],
            input: {
                name: '',
                username: '',
                email: '',
                password: '',
                password_confirm: '',
                isAdmin: false,
                createDefaultTeam: false
            },
            errors: {}
        }
    },
    computed: {
        formValid () {
            return this.input.email &&
                   (this.input.username && !this.errors.username) &&
                   (this.input.password === this.input.password_confirm) &&
                   !this.errors.name && !this.errors.password
        }
    },
    watch: {
        'input.username': function (v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.username = t('ui.mustOnlyContainAZ09')
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
            if (this.input.password.length < 8) {
                this.errors.password = t('ui.passwordMustBeAtLeast8Characters')
                return
            }
            if (this.input.password.length > 128) {
                this.errors.password = t('ui.passwordTooLong')
                return
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
                return
            }
            this.errors.password = ''
        },
        'input.name': function (v) {
            if (v && /:\/\//i.test(v)) {
                this.errors.name = t('ui.namesCanNotBeUrls')
            } else {
                this.errors.name = ''
            }
        }
    },
    async mounted () {
        this.mounted = true
        const { default: zxcvbnImp } = await import('zxcvbn')
        zxcvbn = zxcvbnImp
    },
    methods: {
        createUser () {
            // If admin privilege is being granted, show confirmation first
            if (this.input.isAdmin) {
                this.$refs.confirmAdminDialog.show()
            } else {
                this.submitUser()
            }
        },
        submitUser () {
            const opts = { ...this.input, name: this.input.name || this.input.username }
            delete opts.password_confirm
            usersApi.create(opts).then(result => {
                this.$router.push({ path: '/admin/users' })
            }).catch(err => {
                console.error(err.response.data)
                if (err.response?.data) {
                    if (/username/.test(err.response.data.error)) {
                        this.errors.username = t('ui.usernameUnavailable')
                    }
                    if (/password/.test(err.response.data.error)) {
                        this.errors.password = t('ui.invalidUsername')
                    }
                    if (/email/.test(err.response.data.error)) {
                        this.errors.email = t('ui.emailUnavailable')
                    }
                }
            })
        },
        handleAdminConfirmed () {
            // User confirmed - proceed with creating admin user
            this.submitUser()
        },
        handleAdminCanceled () {
            // User canceled - do nothing, they can modify the form and try again
        }
    }
}
</script>
