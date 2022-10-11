<template>
    <ff-layout-box>
        <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <div>
                <ff-button class="m-auto" @click="verifyEmail()">Click here to verify your email address</ff-button>
            </div>
        </form>
    </ff-layout-box>
</template>

<script>

import { mapState } from 'vuex'
import userApi from '@/api/user'
import alerts from '@/services/alerts'
import FFLayoutBox from '@/layouts/Box'

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
                    console.log(err)
                }
            }
        }
    },
    components: {
        'ff-layout-box': FFLayoutBox
    }
}
</script>
