<template>
    <ff-loading v-if="loading" :message="$t('ui.changingPassword')" />
    <form v-else class="space-y-6">
        <FormHeading>{{ $t('ui.twoFactorAuthentication') }}</FormHeading>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="grow">
                <div class="max-w-sm">
                    {{ $t('ui.twoFactorAuthenticationHelpsToSecureYourAccountB') }}
                </div>
                <div v-if="user.sso_enabled" class="max-w-sm mt-2">
                    {{ $t('ui.noteWhenSigningInViaYourSsoProviderYouWillNotBeC') }}
                </div>
            </div>
            <div class="min-w-fit shrink-0">
                <ff-button v-if="!user.mfa_enabled" data-action="enable-mfa" kind="primary" @click="setupMFA()">{{ $t('ui.enableTwoFactorAuthentication') }}</ff-button>
                <ff-button v-else data-action="disable-mfa" kind="danger" @click="disableMFA()">{{ $t('ui.disableTwoFactorAuthentication') }}</ff-button>
            </div>
        </div>
    </form>
    <MFASetupDialog ref="mfaSetupDialog" @user-updated="userUpdated" />
</template>

<script>
import { mapState } from 'pinia'

import userApi from '../../../api/user.js'
import FormHeading from '../../../components/FormHeading.vue'

import { t } from '../../../i18n.js'
import Dialog from '../../../services/dialog.js'

import MFASetupDialog from './dialogs/MFASetupDialog.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'

export default {
    name: 'AccountSecurityChangePassword',
    components: {
        FormHeading,
        MFASetupDialog
    },
    data () {
        return {
            loading: false
        }
    },
    computed: {
        ...mapState(useAccountAuthStore, ['user'])
    },
    methods: {
        async userUpdated () {
            const user = await userApi.getUser()
            useAccountAuthStore().setUser(user)
        },
        setupMFA () {
            this.$refs.mfaSetupDialog.show()
        },
        disableMFA () {
            Dialog.show({
                header: t('ui.disableTwoFactorAuthentication2'),
                kind: 'danger',
                text: t('ui.areYouSureYouWantToDisableTwoFactorAuthenticatio'),
                confirmLabel: 'Disable'
            }, async () => {
                await userApi.disableMFA()
                return this.userUpdated()
            })
        }
    }
}
</script>
