<template>
    <form>
        <p class="text-lg text-center">{{ $t('ui.wellDoneThatSAllWeNeedToGetStarted') }}</p>
        <p class="text-center">{{ $t('ui.allOfTheseSettingsCanBeModifiedUnderTheAdminSett') }}</p>
        <div class="flex justify-center">
            <ff-button class="mt-6" @click="done()">
                {{ $t('ui.loginToFlowfuse') }}
            </ff-button>
        </div>
    </form>
</template>

<script>
import httpClient from '../../api/client.js'

export default {
    name: 'SetupFinal',
    props: {
        state: {
            type: Object,
            required: true
        }
    },
    emits: ['error'],
    methods: {
        async done () {
            // eslint-disable-next-line no-undef
            const opts = { _csrf: SETUP_CSRF_TOKEN, stackOverrides: this.state.stackOverrides }
            try {
                await httpClient.post('/setup/finish', opts)
                window.location = '/'
            } catch (err) {
                this.$emit('error')
            }
        }
    }
}
</script>
