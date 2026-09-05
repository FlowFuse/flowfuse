<template>
    <section>
        <p>{{ $t('ui.addANewGithubPersonalAccessTokenToYourTeam') }}</p>
        <ol class="list-decimal list-inside space-y-1 ml-2 mt-2">
            <li>{{ $t('ui.open') }} <a href="https://github.com/settings/personal-access-tokens" target="_blank">{{ $t('ui.githubPersonalAccessTokensSettings') }}</a></li>
            <li>{{ $t('ui.clickOn') }} <strong>{{ $t('ui.generateANewToken') }}</strong></li>
            <li>{{ $t('ui.selectThe') }} <strong>{{ $t('ui.onlySelectRepositories') }}</strong> {{ $t('ui.optionAndPickWhichRepositoriesToGrantAccessTo') }}</li>
            <li>{{ $t('ui.expandThe') }} <strong>{{ $t('ui.repositoryPermissions') }}</strong> {{ $t('ui.sectionAndEnsureThe') }} <strong>{{ $t('ui.contents') }}</strong> {{ $t('ui.optionIsSetTo') }} <strong>{{ $t('ui.readAndWrite') }}</strong></li>
            <li>{{ $t('ui.clickOn') }} <strong>{{ $t('ui.generateToken') }}</strong></li>
            <li>{{ $t('ui.thisWillBeTheOnlyTimeGithubShowsYouTheTokenValue') }}</li>
        </ol>
    </section>
</template>

<script>
export default {
    name: 'GitHubInstructions',
    inheritAttrs: false
}
</script>
