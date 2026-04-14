<template>
    <section>
        <p>Add a new GitHub Personal Access Token to your team.</p>
        <ol class="list-decimal list-inside space-y-1 ml-2 mt-2">
            <li>Open <a href="https://github.com/settings/personal-access-tokens" target="_blank">GitHub Personal Access Tokens Settings</a></li>
            <li>Click on <strong>Generate a new token</strong></li>
            <li>Select the <strong>Only select repositories</strong> option and pick which repositories to grant access to</li>
            <li>Expand the <strong>Repository permissions</strong> section and ensure the <strong>Contents</strong> option is set to <strong>Read and write</strong></li>
            <li>Click on <strong>Generate token</strong></li>
            <li>This will be the only time GitHub shows you the token value. Copy the token into the field below</li>
        </ol>
    </section>
</template>

<script>
export default {
    name: 'GitHubInstructions',
    inheritAttrs: false
}
</script>
