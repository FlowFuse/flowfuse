<template>
    <div
        v-if="showBanner"
        class="ff-banner ff-banner-warning"
        data-el="banner-license-banner"
    >
        <span>
            <ExclamationCircleIcon class="ff-icon mr-2" />
            <span v-if="license.expiring">Your FlowForge license will expire in {{ license.daysRemaining }} day{{ license.daysRemaining > 1 ? 's': '' }}.</span>
            <span v-else-if="license.expired">Your FlowForge license has expired.</span>
        </span>

        <template>
            <ChevronRightIcon class="ff-icon align-self-right" />
        </template>
    </div>
</template>

<script>
import { ChevronRightIcon, ExclamationCircleIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

export default {
    name: 'LicenseBanner',
    components: {
        ExclamationCircleIcon,
        ChevronRightIcon
    },
    computed: {
        ...mapState('account', ['settings', 'user']),
        license () {
            return this.settings.license || {}
        },
        showBanner () {
            return (this.license.expiring && this.user.admin) || this.license.expired
        }
    }
}
</script>
