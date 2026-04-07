<template>
    <div
        v-if="showBanner"
        class="ff-banner ff-banner-warning"
        data-el="banner-license-banner"
    >
        <span>
            <ExclamationCircleIcon class="ff-icon mr-2" />
            <span v-if="license.expiring">Your FlowFuse license will expire in {{ license.daysRemaining }} day{{ license.daysRemaining > 1 ? 's': '' }}.</span>
            <span v-else-if="license.expired">Your FlowFuse license has expired.</span>
        </span>

        <ChevronRightIcon class="ff-icon align-self-right" />
    </div>
</template>

<script>
import { ChevronRightIcon, ExclamationCircleIcon } from '@heroicons/vue/outline'

import { mapState } from 'pinia'
import { mapState as mapVuexState } from 'vuex'

import { useAccountAuthStore } from '@/stores/account-auth.js'

export default {
    name: 'LicenseBanner',
    components: {
        ExclamationCircleIcon,
        ChevronRightIcon
    },
    computed: {
        ...mapVuexState('account', ['settings']),
        ...mapState(useAccountAuthStore, ['user']),
        license () {
            return this.settings.license || {}
        },
        showBanner () {
            return (this.license.expiring && this.user.admin) || this.license.expired
        }
    }
}
</script>
