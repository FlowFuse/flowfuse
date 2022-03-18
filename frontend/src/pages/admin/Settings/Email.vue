<template>
    <FormHeading>Email Configuration</FormHeading>
    <template v-if="!settings.email">
        <p>Email is not currently configured for the platform. This restricts some
            of the available features.</p>
        <p>To configure email, refer to the documentation.</p>
    </template>
    <template v-else>
        <table class="">
            <tr class="text-sm" v-for="(value, name) in settings.email" :key="name">
                <td class="font-medium p-2 pr-4 align-top">{{name}}</td><td class="font-mono p-2">{{value}}</td>
            </tr>
        </table>
    </template>
</template>

<script>
import FormHeading from '@/components/FormHeading'
import { mapState } from 'vuex'
export default {
    name: 'AdminSettingsEmail',
    computed: {
        ...mapState('account', ['settings'])
    },
    components: {
        FormHeading
    }
}
</script>
