<template>
    <FormHeading>{{ $t('ui.emailConfiguration') }}</FormHeading>
    <template v-if="!settings.email">
        <p>
            {{ $t('ui.emailIsNotCurrentlyConfiguredForThePlatformThisR') }}
        </p>
        <p>{{ $t('ui.toConfigureEmailReferToTheDocumentation') }}</p>
    </template>
    <template v-else>
        <table class="">
            <tr v-for="(value, name) in settings.email" :key="name" class="text-sm">
                <td class="font-medium p-2 pr-4 align-top">{{ name }}</td><td class="font-mono p-2">{{ value }}</td>
            </tr>
        </table>
    </template>
</template>

<script>
import { mapState } from 'pinia'

import FormHeading from '../../../components/FormHeading.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'AdminSettingsEmail',
    components: {
        FormHeading
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['settings'])
    }
}
</script>
