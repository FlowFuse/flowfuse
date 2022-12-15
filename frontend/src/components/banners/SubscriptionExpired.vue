<template>
    <div
        class="ff-banner ff-banner-warning"
        data-el="banner-subscription-expired"
    >
        <ExclamationCircleIcon class="ff-icon mr-2" /> The subscription for this team has expired.

        <template v-if="hasPermission('team:edit')">
            <template v-if="!onBillingPage">
                Please visit
                <router-link
                    :to="`/team/${team.slug}/billing`"
                    data-nav="banner-team-billing"
                >
                    Billing settings
                </router-link>
                to renew.
            </template>
        </template>
        <template v-else>
            Please ask a team administrator to renew the subscription.
        </template>
    </div>
</template>

<script>
import { ExclamationCircleIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'SubscriptionExpired',
    components: {
        ExclamationCircleIcon
    },
    mixins: [permissionsMixin],
    props: {
        team: {
            type: Object,
            required: true
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        onBillingPage () {
            const billingUrl = '/team/' + this.team.slug + '/billing'
            return this.$route.path.includes(billingUrl)
        },
        subscriptionExpired () {
            return this.team.billingSetup && !this.team.subscriptionActive
        }
    }
}
</script>
