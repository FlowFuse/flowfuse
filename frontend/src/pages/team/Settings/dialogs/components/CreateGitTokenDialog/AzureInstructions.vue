<template>
    <section>
        <p>{{ $t('ui.azureDevopsInstructionsComingSoon') }}</p>
        <ol class="list-decimal list-inside space-y-1 ml-2 mt-2">
            <li>{{ $t('ui.open') }} <code>https://dev.azure.com/[org-name]/_usersSettings/tokens</code> {{ $t('ui.toCreateANewPersonalAccessToken') }}</li>
            <li>{{ $t('ui.clickThe') }} <strong>+ New Token</strong> {{ $t('ui.button') }}</li>
            <li>{{ $t('ui.giveTheTokenANameAndSetTheExpiryDate') }}</li>
            <li>{{ $t('ui.select') }} <strong>{{ $t('ui.customDefined') }}</strong> {{ $t('ui.forTheScopes') }}</li>
            <li>{{ $t('ui.checkThe') }} <strong>Read &amp; Write</strong> {{ $t('ui.inThe') }} <strong>{{ $t('ui.code') }}</strong> {{ $t('ui.section') }}</li>
            <li>{{ $t('ui.hit') }}<strong>{{ $t('ui.save') }}</strong></li>
            <li>{{ $t('ui.thisWillBeTheOnlyTimeAzureShowsYouTheTokenValueC') }}</li>
        </ol>
    </section>
</template>

<script>
export default {
    name: 'AzureInstructions',
    inheritAttrs: false
}
</script>
