<template>
    <ff-loading v-if="loading" message="Changing Password..." />
    <form v-else class="space-y-6">
        <FormHeading>Two-factor Authentication</FormHeading>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm">
                    Two-factor authentication helps to secure your account by requiring a second
                    layer of identification.
                </div>
                <div v-if="user.sso_enabled" class="max-w-sm mt-2">
                    Note: when signing in via your SSO provider, you will not be challenged for your two-factor authentication code
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button v-if="!user.mfa_enabled" data-action="enable-mfa" kind="secondary" @click="setupMFA()">Enable two-factor authentication</ff-button>
                <ff-button v-else data-action="disable-mfa" kind="secondary" @click="disableMFA()">Disable two-factor authentication</ff-button>
            </div>
        </div>
    </form>
    <MFASetupDialog ref="mfaSetupDialog" @user-updated="userUpdated" />
</template>

<script>
import { mapState } from 'vuex'

import userApi from '../../../api/user.js'
import FormHeading from '../../../components/FormHeading.vue'

import Dialog from '../../../services/dialog.js'

import MFASetupDialog from './dialogs/MFASetupDialog.vue'

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
        ...mapState('account', ['user', 'features'])
    },
    methods: {
        async userUpdated () {
            const user = await userApi.getUser()
            this.$store.dispatch('account/setUser', user)
        },
        setupMFA () {
            this.$refs.mfaSetupDialog.show()
        },
        disableMFA () {
            Dialog.show({
                header: 'Disable Two-Factor Authentication',
                kind: 'danger',
                text: 'Are you sure you want to disable two-factor authentication?',
                confirmLabel: 'Disable'
            }, async () => {
                await userApi.disableMFA()
                return this.userUpdated()
            })
        }
    }
}
</script>
