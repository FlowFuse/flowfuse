<template>
    <ff-layout-box>
        <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6" @submit.prevent>
            <p>
                Welcome {{user.name}}, the <a target="_blank" :href="settings['user:tcs-url']">FlowForge Terms &amp; Conditions</a> have been updated.
            </p>
            <p>
                Please review the changes before you continue.
            </p>
            <ff-checkbox v-model="accept" data-action="accept-terms-check">
                I accept
            </ff-checkbox>
            <ff-button :disabled="!accept || loading" kind="primary" @click="acceptAction" data-action="accept-terms-button">Continue</ff-button>
            <ff-button kind="tertiary" @click="logout" data-action="logout-terms-button">Log out</ff-button>
        </form>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'
import userApi from '@/api/user'
import store from '@/store'

import FFLayoutBox from '@/layouts/Box'

export default {
    name: 'TermsAndConditions',
    methods: {
        logout () {
            store.dispatch('account/logout')
        },
        async acceptAction () {
            const options = {}
            try {
                options.tcs_accepted = this.accept
                this.loading = true
                await userApi.updateUser(options)
                this.$store.dispatch('account/checkState')
            } catch (error) {
                console.warn(error)
            } finally {
                this.loading = false
            }
        }
    },
    computed: mapState('account', ['user', 'settings']),
    data () {
        return {
            loading: false,
            accept: false
        }
    },
    components: {
        'ff-layout-box': FFLayoutBox
    }
}
</script>
