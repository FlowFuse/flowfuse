<template>
    <ff-dialog ref="dialog" data-el="mfa-setup" header="Setup two-factor authentication">
        <template #default>
            <template v-if="step === 0">
                <div class="text-center">
                    <img v-if="!!qrcode" :src="qrcode">
                </div>
            </template>
            <template v-if="step === 1">
                <FormRow v-model="verifyToken" data-form="verify-token" maxlength="6">
                    Enter a code from your Authenticator app to ensure its working
                </FormRow>
            </template>
            <template v-if="step === 2">
                Two-factor authentication is now enabled.
            </template>
            <template v-if="step === 3">
                Failed to verify the autentication code. You will need to restart
                the setup to try again.
            </template>
        </template>
        <template #actions>
            <ff-button v-if="step < 2" data-action="mfa-setup-cancel" kind="secondary" @click="cancel()">Cancel</ff-button>
            <ff-button v-if="step < 2" data-action="mfa-setup-next" class="ml-4" :disabled="!canContinue" @click="next()">Next</ff-button>
            <ff-button v-if="step===2" data-action="mfa-setup-done" class="ml-4" @click="complete()">Done</ff-button>
            <ff-button v-if="step===3" data-action="mfa-setup-done" class="ml-4" @click="cancel()">Done</ff-button>
        </template>
    </ff-dialog>
</template>

<script>

import userApi from '../../../../api/user.js'
import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'MFASetupDialog',
    components: {
        FormRow
    },
    emits: ['user-updated'],
    setup () {
        return {
            async show () {
                this.step = 0
                this.qrcode = ''
                this.verifyToken = ''
                this.verifyError = ''
                this.$refs.dialog.show()
                try {
                    const mfaDetails = await userApi.enableMFA()
                    this.qrcode = mfaDetails.qrcode
                } catch (err) {

                }
            }
        }
    },
    data () {
        return {
            step: 0,
            qrcode: '',
            verifyToken: ''
        }
    },
    computed: {
        canContinue () {
            return this.step === 0 ||
                (this.step === 1 && this.verifyToken.length === 6)
        }
    },
    methods: {
        close () {
            this.$refs.dialog.close()
        },
        complete () {
            this.$emit('user-updated')
            this.close()
        },
        async cancel () {
            await userApi.disableMFA()
            this.$emit('user-updated')
            this.close()
        },
        async next () {
            if (this.step === 0) {
                this.step = 1
            } else if (this.step === 1) {
                try {
                    await userApi.verifyMFA(this.verifyToken)
                    this.step = 2
                } catch (err) {
                    this.step = 3
                }
            }
        }
    }
}
</script>
