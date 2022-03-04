<template>
    <form class="space-y-6">
        <FormHeading>View/Update Payment Details</FormHeading>
        <div>
            <button type="button" class="forge-button forge-button-small" @click="customerPortal()">
                <span>Stripe Customer Portal</span>
                <ExternalLinkIcon class="ml-3 w-4" />
            </button>
        </div>
    </form>
</template>

<script>

import API from '@/api/billing.js'
import FormHeading from '@/components/FormHeading'

import { ExternalLinkIcon } from '@heroicons/vue/outline'

export default {
    name: 'TeamSettingsBilling',
    props: [],
    data () { },
    watch: { },
    computed: { },
    mounted () {
        // console.log(this.$route)
        // console.log(this.$store.state.account.team.id)
        // console.log(process.env.VUE_APP_LICENSE_TYPE)
    },
    methods: {
        customerPortal () {
            API.toCustomerPortal(this.$store.state.account.team.id)
        }
    },
    components: {
        FormHeading,
        ExternalLinkIcon
    }
}
</script>
