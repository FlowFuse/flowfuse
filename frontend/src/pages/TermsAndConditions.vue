<template>
    <ff-layout-box class="ff-terms-and-conditions ff--center-box">
        <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6" @submit.prevent>
            <p>
                Welcome {{ user.name }}, the <a target="_blank" :href="settings['user:tcs-url']">FlowFuse Terms &amp; Conditions</a> have been updated.
            </p>
            <p>
                Please review the changes before you continue.
            </p>
            <ff-checkbox v-model="accept" data-action="accept-terms-check">
                I accept
            </ff-checkbox>
            <ff-button :disabled="!accept || loading" kind="primary" data-action="accept-terms-button" @click="acceptAction">Continue</ff-button>
            <ff-button kind="tertiary" data-action="logout-terms-button" @click="logout">Log out</ff-button>
        </form>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'

import userApi from '../api/user.js'
import FFLayoutBox from '../layouts/Box.vue'
import store from '../store/index.js'

export default {
    name: 'TermsAndConditions',
    components: {
        'ff-layout-box': FFLayoutBox
    },
    data () {
        return {
            loading: false,
            accept: false
        }
    },
    computed: mapState('account', ['user', 'settings']),
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
    }
}
</script>
