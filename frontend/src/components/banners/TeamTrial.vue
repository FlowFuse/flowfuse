<template>
    <div
        v-if="team.billing?.trial"
        class="ff-banner"
        :class="{
            'ff-banner-warning': !team.billing?.active,
            'ff-banner-info': team.billing?.active,
            'cursor-pointer': linkToBilling
        }"
        data-el="banner-team-trial"
        @click="navigateToBilling"
    >
        <span >
            <ExclamationCircleIcon class="ff-icon mr-2" />
            <span v-if="!team.billing?.trialEnded">
                You have <span class="font-bold">{{ trialEndsIn }} left</span> of your free trial.
                <span v-if="team.billing?.active">
                    You trial projects will be added to your billing subscription at the end of your trial.
                </span>
                <span v-else>
                    Click here to setup billing at any time to keep your project running after the trial the ends.
                </span>
            </span>
            <span v-else>
                Your trial has ended.
                <span v-if="!team.billing?.active">
                    You will need to setup billing to continuing using this team.
                </span>
            </span>
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
        trialEndsIn () {
            if (this.team.billing?.trialEndsAt) {
                const trialEndDate = new Date(this.team.billing.trialEndsAt)
                const daysLeft = Math.ceil((trialEndDate.getTime() - Date.now()) / 86400000)
                return daysLeft + ' day' + (daysLeft !== 1 ? 's' : '')
            }
            return ''
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
