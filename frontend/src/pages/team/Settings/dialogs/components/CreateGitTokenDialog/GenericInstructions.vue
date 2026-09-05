<template>
    <section>
        <p>{{ $t('ui.connectToAnyGitServerGitlabBitbucketGiteaOrASelf') }}</p>
        <ol class="list-decimal list-inside space-y-1 ml-2 mt-2">
            <li>Create a Personal Access Token (or App Password) on your Git server with read &amp; write access to the repository</li>
            <li>{{ $t('ui.enterTheUsernameAssociatedWithThatToken') }}</li>
            <li>{{ $t('ui.pasteTheTokenValueIntoTheFieldBelow') }}</li>
        </ol>
    </section>
</template>

<script>
export default {
    name: 'GenericInstructions',
    inheritAttrs: false
}
</script>
