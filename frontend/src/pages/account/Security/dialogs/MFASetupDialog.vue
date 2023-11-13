<template>
    <ff-dialog ref="dialog" data-el="mfa-setup" header="Setup two-factor authentication">
        <template #default>
            <div class="space-y-4">
                <template v-if="step === 0">
                    <p>
                        To get started, scan the following QR code into your Authenticator app, then click next to continue.
                    </p>
                    <div class="text-center mt-4">
                        <img v-if="!!qrcode" :src="qrcode" class="m-auto border rounded">
                    </div>
                </template>
                <template v-if="step === 1">
                    <p>
                        Enter a code from your Authenticator app to check everything is working.
                    </p>
                    <div class="w-32">
                        <ff-text-input
                            ref="verify-token"
                            v-model="verifyToken"
                            :maxlength="6"
                            data-form="verify-token"
                            class=""
                        />
                    </div>
                </template>
                <template v-if="step === 2">
                    <p>
                        Two-factor authentication is now enabled.
                    </p>
                    <p>
                        You will need to provide a code from your Authenticator app each time you login from now on.
                    </p>
                </template>
                <template v-if="step === 3">
                    Failed to verify the code. You will need to restart the setup to try again.
                </template>
            </div>
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

export default {
    name: 'MFASetupDialog',
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
                (this.step === 1 && /^\d\d\d\d\d\d$/.test(this.verifyToken))
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
                await this.$nextTick()
                this.$refs['verify-token'].focus()
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
