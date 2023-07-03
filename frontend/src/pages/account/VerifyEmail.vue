<template>
    <ff-layout-box>
        <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-4 space-y-4">
            <div class="text-center mx-20 -mt-10">
                <div class="inline-block">
                    <img class="max-h-32" src="../../images/pictograms/envelope.png" alt="Email Envelope">
                </div>
                <h3 class="text-lg font-bold">Please verify your email</h3>
                <p class="text-gray-400">Once verified, you will be able to access the platform.</p>
                <div class="mx-auto mt-10">
                    <ff-button class="mx-auto" @click="verifyEmail()">Verify my email</ff-button>
                </div>
            </div>
        </form>
    </ff-layout-box>
</template>

<script>

import { mapState } from 'vuex'

import userApi from '../../api/user.js'
import FFLayoutBox from '../../layouts/Box.vue'
import alerts from '../../services/alerts.js'

export default {
    name: 'VerifyEmail',
    props: ['token'],
    computed: {
        ...mapState(['pending'])
    },
    methods: {
        async verifyEmail () {
            const timing = 4000
            try {
                await userApi.verifyEmailToken(this.$route.params.token)
                window.location = '/'
            } catch (err) {
                if (err.response?.data) {
                    alerts.emit(`Unable to verify email. ${err.response.data.error}`, 'warning', timing)
                } else {
                    alerts.emit('Unable to verify email. Check logs for details.', 'warning', timing)
                    console.error(err)
                }
            }
        }
    },
    components: {
        'ff-layout-box': FFLayoutBox
    }
}
</script>
