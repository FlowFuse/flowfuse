<template>
    <ff-dialog ref="dialog" data-el="mfa-setup" :header="$t('ui.setupTwoFactorAuthentication')">
        <template #default>
            <div class="space-y-4">
                <template v-if="step === 0">
                    <template v-if="showQRCode">
                        <p>
                            {{ $t('ui.toGetStartedScanTheFollowingQrCodeIntoYourAuthen') }}
                        </p>
                        <div class="text-center mt-4">
                            <template v-if="!!qrcode">
                                <img v-if="!!qrcode" :src="qrcode" class="m-auto border rounded-sm">
                                <p>
                                    <a class="cursor-pointer" @click="showSecret()">{{ $t('ui.canTScanQrCode') }}</a>
                                </p>
                            </template>
                        </div>
                    </template>
                    <template v-else>
                        <p>
                            {{ $t('ui.toGetStartedEnterTheFollowingCodeIntoYourAuthent') }}
                        </p>
                        <div class="text-center mt-4">
                            <p class="text-2xl w-72 text-wrap font-mono tracking-wider mx-auto my-2">
                                <template v-for="i in secretCode" :key="i">
                                    <span class="mx-1">{{ i }}</span><wbr>
                                </template>
                            </p>
                            <p>
                                <a class="cursor-pointer" @click="hideSecret()">{{ $t('ui.showQrCode') }}</a>
                            </p>
                        </div>
                    </template>
                </template>
                <template v-if="step === 1">
                    <p>
                        {{ $t('ui.enterACodeFromYourAuthenticatorAppToCheckEveryth') }}
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
                        {{ $t('ui.twoFactorAuthenticationIsNowEnabled') }}
                    </p>
                    <p>
                        {{ $t('ui.youWillNeedToProvideACodeFromYourAuthenticatorAp') }}
                    </p>
                </template>
                <template v-if="step === 3">
                    {{ $t('ui.failedToVerifyTheCodeYouWillNeedToRestartTheSetu') }}
                </template>
            </div>
        </template>
        <template #actions>
            <ff-button v-if="step < 2" data-action="mfa-setup-cancel" kind="secondary" @click="cancel()">{{ $t('ui.cancel') }}</ff-button>
            <ff-button v-if="step < 2" data-action="mfa-setup-next" class="ml-4" :disabled="!canContinue" @click="next()">{{ $t('ui.next') }}</ff-button>
            <ff-button v-if="step===2" data-action="mfa-setup-done" class="ml-4" @click="complete()">{{ $t('ui.done') }}</ff-button>
            <ff-button v-if="step===3" data-action="mfa-setup-done" class="ml-4" @click="cancel()">{{ $t('ui.done') }}</ff-button>
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
                this.showQRCode = true
                this.secretCode = []
                this.verifyToken = ''
                this.verifyError = ''
                this.$refs.dialog.show()
                try {
                    const mfaDetails = await userApi.enableMFA()
                    this.qrcode = mfaDetails.qrcode
                    this.secretCode = mfaDetails.url.split('=')[1].match(/.{1,4}/g)
                } catch (err) {

                }
            }
        }
    },
    data () {
        return {
            step: 0,
            showQRCode: true,
            qrcode: '',
            verifyToken: '',
            secretCode: []
        }
    },
    computed: {
        canContinue () {
            return this.step === 0 ||
                (this.step === 1 && /^\d{6}$/.test(this.verifyToken))
        }
    },
    methods: {
        close () {
            this.$refs.dialog.close()
        },
        showSecret () {
            this.showQRCode = false
        },
        hideSecret () {
            this.showQRCode = true
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
