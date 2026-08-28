<template>
    <form v-if="!appLoader" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        <div>
            <ff-button class="m-auto" @click="verify()">{{ $t('ui.clickHereToVerifyYourChangeOfEmailAddress') }}</ff-button>
        </div>
    </form>
</template>

<script>

import { mapState } from 'pinia'

import userApi from '../../api/user.js'
import { t } from '../../i18n.js'
import alerts from '../../services/alerts.js'

import { useUxLoadingStore } from '@/stores/ux-loading.js'

export default {
    name: 'VerifyPendingEmailChange',
    props: {
        token: { type: String, required: true }
    },
    computed: {
        ...mapState(useUxLoadingStore, ['appLoader'])
    },
    methods: {
        async verify () {
            const timing = 4000
            try {
                await userApi.verifyPendingEmailChangeToken(this.$route.params.token)
                window.location = '/'
            } catch (err) {
                if (err.response?.data) {
                    alerts.emit(`Unable to confirm new email. ${err.response.data.error}`, 'warning', timing)
                } else {
                    alerts.emit(t('ui.unableToConfirmNewEmailCheckLogsForDetails'), 'warning', timing)
                    console.error(err)
                }
            }
        }
    }
}
</script>
