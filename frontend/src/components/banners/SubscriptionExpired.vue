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
            <span v-if="subscriptionExpired">{{ $t('ui.theSubscriptionForThisTeamHasExpired') }}</span>
            <span v-else-if="subscriptionPastDue">{{ $t('ui.theSubscriptionForThisTeamHasOverDuePayments') }}</span>
            <template v-if="linkToBilling">
                {{ $t('ui.pleaseVisit') }} <strong>{{ $t('ui.billingSettings') }}</strong> {{ $t('ui.toUpdate') }}
            </template>
            <template v-else-if="!hasPermission('team:edit')">
                {{ $t('ui.pleaseAskATeamAdministratorToUpdateTheSubscripti') }}
            </template>
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
    name: 'SubscriptionExpired',
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
