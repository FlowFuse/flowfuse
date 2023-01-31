<template>
    <div
        v-if="trialEndsIn > 0"
        class="ff-banner ff-banner-warning"
        :class="{
            'cursor-pointer': linkToBilling
        }"
        data-el="banner-team-trial"
        @click="navigateToBilling"
    >
        <span >
            <ExclamationCircleIcon class="ff-icon mr-2" />
            <span v-if="!isTrialEnded">You have <span class="font-bold">{{ trialEndsIn }} days left</span> of your free trial.</span>
            <span v-else>Your trial has eneded.</span>
            Click here to setup billing at any time to keep your project running after the trial the ends.
        </span>
        <template v-if="linkToBilling">
            <ChevronRightIcon class="ff-icon align-self-right" />
        </template>
    </div>
</template>

<script>
import { ChevronRightIcon, ExclamationCircleIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'TeamTrialBanner',
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
        isTrialMode: function () {
            return !!this.team.trialEndsAt
        },
        isTrialEnded: function () {
            if (this.team.trialEndsAt) {
                const trialEndDate = new Date(this.team.trialEndsAt)
                return trialEndDate < Date.now()
            }
            return true
        },
        trialEndsIn () {
            if (this.team.trialEndsAt) {
                const trialEndDate = new Date(this.team.trialEndsAt)
                return Math.ceil((trialEndDate.getTime() - Date.now()) / 86400000)
            }
            return -1
        }
        // subscriptionExpired () {
        //     if (this.team.trialEndsAt) {
        //         const trialEndDate
        //     }
        //     return this.team.billingSetup && !this.team.subscriptionActive
        // }
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
