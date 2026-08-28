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
        <span>
            <ExclamationCircleIcon class="ff-icon mr-2" />
            <span v-if="!team.billing?.trialEnded">
                {{ $t('ui.youHave') }} <span class="font-bold">{{ $t('ui.p0Left', { p0: trialEndsIn }) }}</span> {{ $t('ui.ofYourFreeTrial') }}
                <span v-if="team.billing?.active">
                    <!-- TODO: remove in 1.14 as this will become an unneeded state once existing trials expire -->
                    {{ $t('ui.youTrialInstancesWillBeAddedToYourBillingSubscri') }}
                </span>
                <span v-else>
                    {{ $t('ui.clickHereToSetupBilling') }}
                </span>
            </span>
            <span v-else>
                {{ $t('ui.yourTrialHasEnded') }}
                <span v-if="!team.billing?.active">
                    {{ $t('ui.youWillNeedToSetupBillingToContinueUsingThisTeam') }}
                </span>
            </span>
        </span>
        <template v-if="linkToBilling">
            <ChevronRightIcon class="ff-icon align-self-right" />
        </template>
    </div>
</template>

<script>
import { ChevronRightIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'

import { mapState } from 'pinia'

import usePermissions from '../../composables/Permissions.js'

import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamTrialBanner',
    components: {
        ExclamationCircleIcon,
        ChevronRightIcon
    },
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        billingPath () {
            return '/team/' + this.team.slug + '/settings/change-type'
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
