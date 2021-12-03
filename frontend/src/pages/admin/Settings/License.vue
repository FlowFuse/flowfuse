<template>
    <FormHeading>Current License</FormHeading>
    <template v-if="license">
        <table>
            <tr><td class="font-medium p-2 pr-4 align-top">Organisation</td><td class="p-2">{{license.organisation}}</td></tr>
            <tr><td class="font-medium p-2 pr-4 align-top">Tier</td><td class="p-2">{{license.tier}}</td></tr>
            <tr><td class="font-medium p-2 pr-4 align-top">Expires</td><td class="p-2">{{license.expires}}<br><span class="text-xs">{{license.expiresAt}}</span></td></tr>
        </table>
        <details><pre>{{license}}</pre></details>
    </template>
    <template v-else>
        No license applied
    </template>

</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import adminApi from '@/api/admin'

export default {
    name: 'AdminSettingsLicense',
    components: {
        FormRow,
        FormHeading
    },
    data: function() {
        return {
            license: {},
        }
    },
    async mounted() {
        this.license = await adminApi.getLicenseDetails();
    }
}
</script>
