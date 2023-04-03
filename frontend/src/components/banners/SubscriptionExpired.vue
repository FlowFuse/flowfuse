<template>
    <div
        v-if="subscriptionExpired || subscriptionPastDue"
        class="ff-banner ff-banner-warning"
        :class="{
            'cursor-pointer': linkToBilling
        }"
        data-el="banner-subscription-expired"
        @click="navigateToBilling"
    >
        <span>
            <ExclamationCircleIcon class="ff-icon mr-2" />
            <span v-if="subscriptionExpired">The subscription for this team has expired.</span>
            <span v-else-if="subscriptionPastDue">The subscription for this team has over due payments.</span>
            <template v-if="linkToBilling">
                Please visit <strong>Billing settings</strong> to update.
            </template>
            <template v-else-if="!hasPermission('team:edit')">
                Please ask a team administrator to update the subscription.
            </template>
        </span>

        <template v-if="linkToBilling">
            <ChevronRightIcon class="ff-icon align-self-right" />
        </template>
    </div>
</template>

<script>
import { ChevronRightIcon, ExclamationCircleIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import permissionsMixin from '../../mixins/Permissions'

export default {
    name: 'SubscriptionExpired',
    components: {
        ExclamationCircleIcon,
        ChevronRightIcon
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
        billingPath () {
            return '/team/' + this.team.slug + '/billing'
        },
        linkToBilling () {
            return this.hasPermission('team:edit') && !this.onBillingPage
        },
        onBillingPage () {
            return this.$route.path.includes(this.billingPath)
        },
        subscriptionPastDue () {
            return this.team.billing?.pastDue
        },
        subscriptionExpired () {
            return this.team.billing?.canceled
        }
    },
    methods: {
        navigateToBilling () {
            if (!this.linkToBilling) {
                return
            }
            this.$router.push(this.billingPath)
        }
    }
}
</script>
