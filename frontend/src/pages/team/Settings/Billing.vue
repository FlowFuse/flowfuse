<template>
    <form class="space-y-6">
        <FormHeading>Details</FormHeading>
        <div>
            Active Billing Period &amp; Amount to be charged HERE
        </div>
        <FormHeading>Invoices</FormHeading>
        <div>
            Link to Stripe Invoices HERE
        </div>
        <FormHeading>Update Payment Details</FormHeading>
        <div>
            Link to Stripe UI HERE
        </div>
    </form>
</template>

<script>

import FormHeading from '@/components/FormHeading'

export default {
    name: 'TeamSettingsBilling',
    props: [],
    data () { },
    watch: { },
    computed: { },
    mounted () {
        console.log(process.env.VUE_APP_LICENSE_TYPE)
    },
    methods: { },
    components: {
        FormHeading
    }
}
</script>
