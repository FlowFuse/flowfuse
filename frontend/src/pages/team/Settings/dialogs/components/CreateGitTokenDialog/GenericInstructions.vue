<template>
    <section>
        <p>Connect to any Git server (GitLab, Bitbucket, Gitea, or a self-hosted instance) over HTTPS.</p>
        <ol class="list-decimal list-inside space-y-1 ml-2 mt-2">
            <li>Create a Personal Access Token (or App Password) on your Git server with read &amp; write access to the repository</li>
            <li>Enter the username associated with that token</li>
            <li>Paste the token value into the field below</li>
        </ol>
    </section>
</template>

<script>
export default {
    name: 'GenericInstructions',
    inheritAttrs: false
}
</script>
