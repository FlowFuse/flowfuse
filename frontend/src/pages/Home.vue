<template>
    <FormHeading>Your Teams</FormHeading>
    <div class="text-sm px-4 sm:px-6 lg:px-8 mt-8">
        <AccountTeams />
    </div>
</template>

<script>
import AccountTeams from "@/pages/account/Teams"
import FormHeading from '@/components/FormHeading'


export default {
    name: 'Home',
    components: {
        AccountTeams,
        FormHeading
    }
}
</script>
